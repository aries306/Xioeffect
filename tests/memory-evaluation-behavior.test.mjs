import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMemoryForContext } from "../lib/memory-evaluation.ts";

const NOW = Date.parse("2026-10-10T12:00:00.000Z");
const validMemory = (overrides = {}) => ({
  lifecycleState: "active",
  confidence: 85,
  relevance: 90,
  scope: {},
  provenance: { type: "conversation", userId: "user-1", conversationId: "conversation-1" },
  updatedAt: "2026-10-09T12:00:00.000Z",
  lastConfirmedAt: "2026-10-09T12:00:00.000Z",
  text: "User prefers concise strategic planning.",
  category: "preference",
  ...overrides,
});

test("eligible memory requires usable provenance with a type and lineage", () => {
  assert.equal(evaluateMemoryForContext(validMemory(), {}, NOW).eligible, true);
  for (const provenance of [{}, { type: "conversation" }, { userId: "user-1" }, { type: " " , userId: "user-1" }]) {
    const result = evaluateMemoryForContext(validMemory({ provenance }), {}, NOW);
    assert.equal(result.eligible, false);
    assert.equal(result.status, "insufficient_provenance");
    assert.equal(result.influenceWeight, 0);
  }
});

test("invalid timestamps fail closed rather than making memory appear fresh", () => {
  const invalidUpdate = evaluateMemoryForContext(validMemory({ updatedAt: "not-a-date" }), {}, NOW);
  assert.equal(invalidUpdate.eligible, false);
  assert.equal(invalidUpdate.status, "stale");
  assert.deepEqual(invalidUpdate.reasons, ["invalid_updated_at"]);

  const invalidConfirmation = evaluateMemoryForContext(validMemory({ lastConfirmedAt: "yesterday-ish" }), {}, NOW);
  assert.equal(invalidConfirmation.eligible, false);
  assert.equal(invalidConfirmation.status, "stale");
  assert.deepEqual(invalidConfirmation.reasons, ["invalid_last_confirmed_at"]);
});

test("old confirmation does not keep a stale memory eligible", () => {
  const result = evaluateMemoryForContext(validMemory({
    updatedAt: "2026-10-09T12:00:00.000Z",
    lastConfirmedAt: "2025-01-01T00:00:00.000Z",
  }), {}, NOW);
  assert.equal(result.eligible, false);
  assert.equal(result.status, "stale");
  assert.ok(result.reasons.includes("stale_without_recent_confirmation"));
});

test("scoped memories require an explicit matching context", () => {
  const memory = validMemory({ scope: { contexts: ["project-alpha"] } });
  const missing = evaluateMemoryForContext(memory, {}, NOW);
  assert.equal(missing.eligible, false);
  assert.equal(missing.status, "out_of_scope");
  assert.ok(missing.reasons.includes("context_required_for_scoped_memory"));

  const mismatch = evaluateMemoryForContext(memory, { context: "project-beta" }, NOW);
  assert.equal(mismatch.eligible, false);
  assert.ok(mismatch.reasons.includes("context_scope_mismatch"));

  const match = evaluateMemoryForContext(memory, { context: "project-alpha" }, NOW);
  assert.equal(match.eligible, true);
});

test("review, weak confidence, weak relevance, and inactive lifecycle never influence retrieval", () => {
  for (const overrides of [
    { lifecycleState: "review" },
    { confidence: 30 },
    { relevance: 30 },
    { lifecycleState: "superseded" },
  ]) {
    const result = evaluateMemoryForContext(validMemory(overrides), {}, NOW);
    assert.equal(result.eligible, false);
    assert.equal(result.influenceWeight, 0);
  }
});

test("a fresh active memory gets a bounded confidence-relevance weight", () => {
  const result = evaluateMemoryForContext(validMemory(), {}, NOW);
  assert.equal(result.eligible, true);
  assert.equal(result.status, "eligible");
  assert.equal(result.influenceWeight, 0.765);
});
