import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMemoryForContext, findContradictionCandidates } from "../lib/memory-evaluation.ts";

const NOW = Date.parse("2026-10-10T12:00:00.000Z");
const memory = (overrides = {}) => ({
  lifecycleState: "active",
  confidence: 85,
  relevance: 90,
  scope: {},
  provenance: { type: "conversation", userId: "u-1", conversationId: "c-1", capturedAt: "2026-10-09T12:00:00.000Z" },
  updatedAt: "2026-10-09T12:00:00.000Z",
  lastConfirmedAt: "2026-10-09T12:00:00.000Z",
  text: "User prefers concise strategic planning.",
  category: "preference",
  ...overrides,
});

test("valid timestamped provenance can be evaluated", () => {
  assert.equal(evaluateMemoryForContext(memory(), {}, NOW).eligible, true);
});

test("missing or invalid provenance timestamp fails closed", () => {
  for (const provenance of [
    {},
    { type: "conversation", userId: "u-1" },
    { type: "conversation", userId: "u-1", capturedAt: "not-a-date" },
  ]) {
    const result = evaluateMemoryForContext(memory({ provenance }), {}, NOW);
    assert.equal(result.eligible, false);
    assert.equal(result.status, "insufficient_provenance");
    assert.equal(result.influenceWeight, 0);
  }
});

test("invalid update and confirmation timestamps fail closed", () => {
  assert.equal(evaluateMemoryForContext(memory({ updatedAt: "bad-date" }), {}, NOW).eligible, false);
  assert.equal(evaluateMemoryForContext(memory({ lastConfirmedAt: "bad-date" }), {}, NOW).eligible, false);
});

test("future-dated provenance and confirmation fail closed", () => {
  const future = "2026-10-10T12:10:00.000Z";
  assert.equal(evaluateMemoryForContext(memory({
    provenance: { type: "conversation", userId: "u-1", capturedAt: future },
  }), {}, NOW).eligible, false);
  assert.equal(evaluateMemoryForContext(memory({ lastConfirmedAt: future }), {}, NOW).eligible, false);
});

test("stale confirmations are not treated as fresh", () => {
  const result = evaluateMemoryForContext(memory({ lastConfirmedAt: "2025-01-01T00:00:00.000Z" }), {}, NOW);
  assert.equal(result.status, "stale");
  assert.equal(result.influenceWeight, 0);
});

test("scoped memories require a matching context", () => {
  const scoped = memory({ scope: { contexts: ["project-alpha"] } });
  assert.equal(evaluateMemoryForContext(scoped, {}, NOW).eligible, false);
  assert.equal(evaluateMemoryForContext(scoped, { context: "project-beta" }, NOW).eligible, false);
  assert.equal(evaluateMemoryForContext(scoped, { context: "project-alpha" }, NOW).eligible, true);
});

test("origin context is retained without blocking related-context re-evaluation", () => {
  const contextual = memory({ scope: { originContext: "personal" } });
  assert.equal(evaluateMemoryForContext(contextual, { context: "personal" }, NOW).eligible, true);
  assert.equal(evaluateMemoryForContext(contextual, { context: "project-alpha" }, NOW).eligible, true);
});

test("review, low-confidence, low-relevance, and inactive memories cannot influence", () => {
  for (const overrides of [
    { lifecycleState: "review" },
    { lifecycleState: "superseded" },
    { confidence: 30 },
    { relevance: 30 },
  ]) {
    const result = evaluateMemoryForContext(memory(overrides), {}, NOW);
    assert.equal(result.eligible, false);
    assert.equal(result.influenceWeight, 0);
  }
});

test("contradiction candidate matching never mutates either memory", () => {
  const original = memory();
  const candidate = memory({ text: "User prefers concise strategic decisions.", category: "preference" });
  const before = JSON.stringify([original, candidate]);
  const matches = findContradictionCandidates(original, [candidate]);
  assert.equal(matches.length, 1);
  assert.equal(JSON.stringify([original, candidate]), before);
});
