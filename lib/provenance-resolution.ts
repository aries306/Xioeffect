export type ProvenanceOriginKind =
  | "conversation"
  | "user_input"
  | "research"
  | "nexus_ingest_event"
  | "derived_inference"
  | "unknown";

export type ProvenanceResolutionStatus = "resolved" | "partial" | "unresolved" | "conflicted";

export type ProvenanceResolution = {
  schemaVersion: 1;
  status: ProvenanceResolutionStatus;
  originKind: ProvenanceOriginKind;
  originId: string | null;
  sourceRef: string | null;
  capturedAt: string | null;
  recordedAt: string | null;
  lineage: Array<{ kind: string; id: string }>;
  issues: string[];
  mayInfluence: boolean;
};

const ORIGIN_ALIASES: Record<string, ProvenanceOriginKind> = {
  conversation: "conversation",
  chat: "conversation",
  user_input: "user_input",
  "user-input": "user_input",
  "sanctum-arrival": "user_input",
  "sanctum_arrival": "user_input",
  research: "research",
  github: "research",
  "github-research": "research",
  nexus: "nexus_ingest_event",
  "nexus-ingest": "nexus_ingest_event",
  "nexus-ingest-event": "nexus_ingest_event",
  nexus_ingest_event: "nexus_ingest_event",
  inference: "derived_inference",
  "derived-inference": "derived_inference",
  derived_inference: "derived_inference",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeOrigin(source: Record<string, unknown>): ProvenanceOriginKind {
  const raw = firstString(source, ["originKind", "type", "sourceType"])?.toLowerCase();
  if (raw && ORIGIN_ALIASES[raw]) return ORIGIN_ALIASES[raw];
  if (firstString(source, ["repository"]) && firstString(source, ["commit_sha", "commitSha"]) && firstString(source, ["path"])) {
    return "research";
  }
  return "unknown";
}

function normalizeLineage(value: unknown): Array<{ kind: string; id: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [{ kind: "source", id: item.trim() }];
    const candidate = record(item);
    const kind = firstString(candidate, ["kind", "type"]);
    const id = firstString(candidate, ["id", "ref", "sourceId"]);
    return kind && id ? [{ kind, id }] : [];
  }).slice(0, 32);
}

/**
 * Resolves provenance without manufacturing an origin from the database row's
 * creation timestamp. recordedAt is storage metadata; capturedAt is source time.
 * NEXUS ingestion events are processing records, never direct memory evidence.
 */
export function resolveProvenance(
  input: unknown,
  recordedAtValue?: unknown,
  ownerId?: string,
): ProvenanceResolution {
  const source = record(input);
  const originKind = normalizeOrigin(source);
  const capturedAt = validTimestamp(source.capturedAt ?? source.retrieved_at ?? source.retrievedAt);
  const recordedAt = validTimestamp(recordedAtValue);
  const sourceRef = firstString(source, ["sourceRef", "source_ref", "url", "uri", "sourceUrl"])
    ?? (originKind === "research" && firstString(source, ["repository", "commit_sha", "commitSha", "path"])
      ? [firstString(source, ["repository"]), firstString(source, ["commit_sha", "commitSha"]), firstString(source, ["path"])].filter(Boolean).join("@")
      : null);
  const originId = firstString(source, [
    "originId", "origin_id", "messageId", "message_id", "conversationId", "conversation_id",
    "researchId", "research_id", "sourceId", "source_id", "documentId", "document_id",
    "eventId", "event_id", "dedupeKey", "dedupe_key",
  ]) ?? (originKind === "research" && sourceRef ? sourceRef : null);
  const lineage = normalizeLineage(source.derivedFrom ?? source.derived_from ?? source.lineage);
  const issues: string[] = [];

  if (ownerId && typeof source.userId === "string" && source.userId !== ownerId) {
    issues.push("provenance_owner_mismatch");
  }
  if (originKind === "nexus_ingest_event") {
    issues.push("nexus_processing_event_is_not_memory_evidence");
  }
  if (originKind === "unknown") issues.push("unknown_origin_kind");
  if (!capturedAt) issues.push("missing_or_invalid_source_capture_time");
  if (!originId && !sourceRef) issues.push("missing_exact_origin_reference");
  if (originKind === "derived_inference" && lineage.length === 0) {
    issues.push("derived_inference_missing_lineage");
  }
  if (originKind === "research" && !firstString(source, ["content_hash", "contentHash", "blob_sha", "blobSha", "commit_sha", "commitSha"])) {
    issues.push("research_source_missing_immutable_version");
  }

  const hardFailure = issues.some((issue) =>
    issue === "provenance_owner_mismatch" ||
    issue === "nexus_processing_event_is_not_memory_evidence" ||
    issue === "unknown_origin_kind" ||
    issue === "missing_or_invalid_source_capture_time" ||
    issue === "missing_exact_origin_reference" ||
    issue === "derived_inference_missing_lineage"
  );
  const status: ProvenanceResolutionStatus = hardFailure
    ? "unresolved"
    : issues.length > 0
      ? "partial"
      : "resolved";

  return {
    schemaVersion: 1,
    status,
    originKind,
    originId,
    sourceRef,
    capturedAt,
    recordedAt,
    lineage,
    issues,
    mayInfluence: status === "resolved",
  };
}
