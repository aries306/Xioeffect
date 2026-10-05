import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMemoryForContext } from "../lib/memory-evaluation.ts";

const base = {
  lifecycleState: "active",
  confidence: 80,
  relevance: 85,
  scope: { contexts: ["business"] },
  provenance: { type: "conversation", conversationId: "test" },
  updatedAt: "2026-10-01T00:00:00.000Z",
  lastConfirmedAt: "2026-10-01T00:00:00.000Z",
  text: "Goal: build a cognitive system",
};

test("eligible memory carries provenance and context", () => {
  const result = evaluateMemoryForContext(base, { context: "business" }, Date.parse("2026-10-05T00:00:00.000Z"));
  assert.equal(result.eligible, true);
  assert.equal(result.status, "eligible");
  assert.ok(result.influenceWeight > 0);
});

test("scope mismatch cannot influence current work", () => {
  const result = evaluateMemoryForContext(base, { context: "personal" }, Date.parse("2026-10-05T00:00:00.000Z"));
  assert.equal(result.eligible, false);
  assert.equal(result.status, "out_of_scope");
});

test("missing provenance is blocked", () => {
  const result = evaluateMemoryForContext({ ...base, provenance: {} }, { context: "business" }, Date.parse("2026-10-05T00:00:00.000Z"));
  assert.equal(result.eligible, false);
  assert.equal(result.status, "insufficient_provenance");
});

test("low-confidence memory is review-only", () => {
  const result = evaluateMemoryForContext({ ...base, confidence: 20 }, { context: "business" }, Date.parse("2026-10-05T00:00:00.000Z"));
  assert.equal(result.eligible, false);
  assert.equal(result.status, "review");
});
