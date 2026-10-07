export type MemoryEvaluationInput = {
  lifecycleState: string;
  confidence: number;
  relevance: number;
  scope: Record<string, unknown>;
  provenance: Record<string, unknown>;
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
};

const ACTIVE_STATES = new Set(["active", "dormant", "review"]);

export function evaluateMemoryForContext(
  memory: MemoryEvaluationInput,
  context: Record<string, unknown>,
  now = Date.now(),
): MemoryEvaluation {
  const reasons: string[] = [];
  if (!ACTIVE_STATES.has(memory.lifecycleState)) {
    return { eligible: false, status: "out_of_scope", reasons: ["lifecycle_state_not_eligible"], influenceWeight: 0 };
  }

  const provenanceKeys = Object.keys(memory.provenance ?? {});
  if (provenanceKeys.length === 0) {
    reasons.push("missing_provenance");
  }

  const scope = memory.scope ?? {};
  const scopedContexts = Array.isArray(scope.contexts) ? scope.contexts.map(String) : [];
  const contextName = typeof context.context === "string" ? context.context : undefined;
  if (scopedContexts.length > 0 && contextName && !scopedContexts.includes(contextName)) {
    return { eligible: false, status: "out_of_scope", reasons: ["context_scope_mismatch"], influenceWeight: 0 };
  }

  const ageDays = Math.max(0, (now - new Date(memory.updatedAt).getTime()) / 86400000);
  const stale = ageDays > 180 && !memory.lastConfirmedAt;
  if (stale) reasons.push("stale_without_recent_confirmation");

  if (memory.confidence < 25) reasons.push("low_confidence");
  if (memory.relevance < 25) reasons.push("low_relevance");

  if (reasons.includes("missing_provenance")) {
    return { eligible: false, status: "insufficient_provenance", reasons, influenceWeight: 0 };
  }

  if (stale) {
    return { eligible: false, status: "stale", reasons, influenceWeight: 0 };
  }

  if (memory.lifecycleState === "review" || memory.confidence < 40 || memory.relevance < 40) {
    return { eligible: false, status: "review", reasons: reasons.length ? reasons : ["explicit_review_required"], influenceWeight: 0.25 };
  }

  const lifecycleWeight = memory.lifecycleState === "active" ? 1 : 0.75;
  const confidenceWeight = Math.max(0, Math.min(1, memory.confidence / 100));
  const relevanceWeight = Math.max(0, Math.min(1, memory.relevance / 100));
  return {
    eligible: true,
    status: "eligible",
    reasons,
    influenceWeight: Number((lifecycleWeight * confidenceWeight * relevanceWeight).toFixed(3)),
  };
}

export function findContradictionCandidates(
  memory: MemoryEvaluationInput,
  candidates: MemoryEvaluationInput[],
): MemoryEvaluationInput[] {
  const tokens = new Set(memory.text.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
  if (tokens.size === 0) return [];
  return candidates.filter((candidate) => {
    if (candidate.text.toLowerCase() === memory.text.toLowerCase()) return false;
    const candidateTokens = candidate.text.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
    const overlap = candidateTokens.filter((t) => tokens.has(t)).length;
    return overlap >= 2 && candidate.category === memory.category;
  });
}
