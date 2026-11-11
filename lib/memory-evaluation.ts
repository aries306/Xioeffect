import { resolveProvenance, type ProvenanceResolution } from "./provenance-resolution";

export type MemoryEvaluationInput = {
  lifecycleState: string;
  confidence: number;
  relevance: number;
  scope: Record<string, unknown>;
  provenance: Record<string, unknown>;
  recordedAt?: string;
  ownerId?: string;
  updatedAt: string;
  lastConfirmedAt?: string | null;
  text: string;
  category?: string;
};

export type MemoryEvaluation = {
  eligible: boolean;
  status: "eligible" | "review" | "stale" | "out_of_scope" | "insufficient_provenance";
  reasons: string[];
  influenceWeight: number;
  provenanceResolution?: ProvenanceResolution;
};

const ACTIVE_STATES = new Set(["active", "dormant", "review"]);
const DAY_MS = 86400000;
const MAX_MEMORY_AGE_DAYS = 180;

function rejected(
  status: MemoryEvaluation["status"],
  reason: string,
  provenanceResolution?: ProvenanceResolution,
): MemoryEvaluation {
  return { eligible: false, status, reasons: [reason], influenceWeight: 0, provenanceResolution };
}

export function evaluateMemoryForContext(
  memory: MemoryEvaluationInput,
  context: Record<string, unknown>,
  now = Date.now(),
): MemoryEvaluation {
  const provenanceResolution = resolveProvenance(memory.provenance, memory.recordedAt, memory.ownerId);
  const reject = (status: MemoryEvaluation["status"], reason: string) => rejected(status, reason, provenanceResolution);

  if (!ACTIVE_STATES.has(memory.lifecycleState)) {
    return reject("out_of_scope", "lifecycle_state_not_eligible");
  }

  if (!Number.isFinite(now)) return reject("stale", "invalid_evaluation_time");
  if (!Number.isFinite(memory.confidence) || memory.confidence < 0 || memory.confidence > 100) {
    return reject("review", "invalid_confidence");
  }
  if (!Number.isFinite(memory.relevance) || memory.relevance < 0 || memory.relevance > 100) {
    return reject("review", "invalid_relevance");
  }
  if (!provenanceResolution.mayInfluence) {
    return reject("insufficient_provenance", provenanceResolution.issues[0] ?? "provenance_unresolved");
  }

  const capturedAtMs = Date.parse(String(provenanceResolution.capturedAt));
  if (capturedAtMs > now + 300000) {
    return reject("insufficient_provenance", "future_provenance_timestamp");
  }

  const scope = memory.scope ?? {};
  const scopedContexts = Array.isArray(scope.contexts)
    ? scope.contexts.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const contextName = typeof context.context === "string" && context.context.trim()
    ? context.context.trim()
    : undefined;

  if (scopedContexts.length > 0) {
    if (!contextName) return reject("out_of_scope", "context_required_for_scoped_memory");
    if (!scopedContexts.includes(contextName)) {
      return reject("out_of_scope", "context_scope_mismatch");
    }
  }

  const updatedAtMs = Date.parse(memory.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return reject("stale", "invalid_updated_at");
  }
  if (updatedAtMs > now + 300000) return reject("stale", "future_updated_at");

  const confirmationValue = memory.lastConfirmedAt;
  const hasConfirmation = typeof confirmationValue === "string" && confirmationValue.trim().length > 0;
  const confirmedAtMs = hasConfirmation ? Date.parse(confirmationValue!) : Number.NaN;
  if (hasConfirmation && !Number.isFinite(confirmedAtMs)) {
    return reject("stale", "invalid_last_confirmed_at");
  }
  if (hasConfirmation && confirmedAtMs > now + 300000) {
    return reject("stale", "future_last_confirmed_at");
  }

  const freshnessTimestamp = hasConfirmation ? confirmedAtMs : capturedAtMs;
  const ageDays = Math.max(0, (now - freshnessTimestamp) / DAY_MS);
  const stale = ageDays > MAX_MEMORY_AGE_DAYS;
  const reasons: string[] = [];
  if (stale) reasons.push("stale_without_recent_confirmation");
  if (memory.confidence < 25) reasons.push("low_confidence");
  if (memory.relevance < 25) reasons.push("low_relevance");

  if (stale) return { eligible: false, status: "stale", reasons, influenceWeight: 0, provenanceResolution };

  if (memory.lifecycleState === "review" || memory.confidence < 40 || memory.relevance < 40) {
    return {
      eligible: false,
      status: "review",
      reasons: reasons.length ? reasons : ["explicit_review_required"],
      influenceWeight: 0,
      provenanceResolution,
    };
  }

  const lifecycleWeight = memory.lifecycleState === "active" ? 1 : 0.75;
  const confidenceWeight = Math.max(0, Math.min(1, memory.confidence / 100));
  const relevanceWeight = Math.max(0, Math.min(1, memory.relevance / 100));
  return {
    eligible: true,
    status: "eligible",
    reasons,
    influenceWeight: Number((lifecycleWeight * confidenceWeight * relevanceWeight).toFixed(3)),
    provenanceResolution,
  };
}

export function findContradictionCandidates(
  memory: MemoryEvaluationInput,
  candidates: MemoryEvaluationInput[],
): MemoryEvaluationInput[] {
  const tokens = new Set(memory.text.toLowerCase().split(/\W+/).filter((token) => token.length > 3));
  if (tokens.size === 0) return [];
  return candidates.filter((candidate) => {
    if (candidate.text.toLowerCase() === memory.text.toLowerCase()) return false;
    const candidateTokens = candidate.text.toLowerCase().split(/\W+/).filter((token) => token.length > 3);
    const overlap = candidateTokens.filter((token) => tokens.has(token)).length;
    return overlap >= 2 && candidate.category === memory.category;
  });
}
