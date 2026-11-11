import test from "node:test";
import assert from "node:assert/strict";
import { resolveProvenance } from "../lib/provenance-resolution.ts";

test("conversation provenance resolves only with an exact source and capture time", () => {
  const result = resolveProvenance({
    type: "conversation",
    userId: "user-1",
    conversationId: "conversation-1",
    capturedAt: "2026-11-07T12:00:00.000Z",
  }, "2026-11-07T12:00:02.000Z", "user-1");
  assert.equal(result.status, "resolved");
  assert.equal(result.originKind, "conversation");
  assert.equal(result.originId, "conversation-1");
  assert.equal(result.mayInfluence, true);
});

test("database recorded time is never substituted for source capture time", () => {
  const result = resolveProvenance({ type: "conversation", conversationId: "conversation-1" }, "2026-11-07T12:00:00.000Z");
  assert.equal(result.capturedAt, null);
  assert.equal(result.recordedAt, "2026-11-07T12:00:00.000Z");
  assert.equal(result.status, "unresolved");
  assert.equal(result.mayInfluence, false);
});

test("NEXUS ingestion events cannot directly become memory evidence", () => {
  const result = resolveProvenance({
    type: "nexus_ingest_event",
    eventId: "nexus-event-1",
    capturedAt: "2026-11-07T12:00:00.000Z",
  });
  assert.equal(result.originKind, "nexus_ingest_event");
  assert.equal(result.status, "unresolved");
  assert.equal(result.mayInfluence, false);
  assert.ok(result.issues.includes("nexus_processing_event_is_not_memory_evidence"));
});

test("research provenance requires an immutable source version", () => {
  const incomplete = resolveProvenance({
    type: "research",
    researchId: "research-1",
    url: "https://example.test/source",
    capturedAt: "2026-11-07T12:00:00.000Z",
  });
  assert.equal(incomplete.status, "partial");
  assert.equal(incomplete.mayInfluence, false);
  const complete = resolveProvenance({
    type: "research",
    researchId: "research-1",
    url: "https://example.test/source",
    content_hash: "sha256:abc",
    capturedAt: "2026-11-07T12:00:00.000Z",
  });
  assert.equal(complete.status, "resolved");
  assert.equal(complete.mayInfluence, true);
});

test("derived inferences require lineage and owner mismatch fails closed", () => {
  assert.equal(resolveProvenance({
    type: "derived_inference",
    originId: "inference-1",
    capturedAt: "2026-11-07T12:00:00.000Z",
  }).mayInfluence, false);
  const mismatch = resolveProvenance({
    type: "conversation",
    userId: "other-user",
    conversationId: "conversation-1",
    capturedAt: "2026-11-07T12:00:00.000Z",
  }, undefined, "user-1");
  assert.equal(mismatch.mayInfluence, false);
  assert.ok(mismatch.issues.includes("provenance_owner_mismatch"));
});
