import test from "node:test";
import assert from "node:assert/strict";
import { parseInferenceLedger } from "../lib/inference-confidence.ts";

test("parses quantified confidence and preserves the uncalibrated status", () => {
  const response = [
    "The project is likely blocked by authentication setup.",
    "<inference_ledger>",
    '[{"claim":"The project is blocked by missing staging authentication.","confidenceScore":82,"evidenceIds":["memory-1","current_input"],"uncertaintyFactors":["No live Clerk session was tested."]}]',
    "</inference_ledger>",
  ].join("\n");
  const result = parseInferenceLedger(response, ["memory-1"], "2026-11-07T12:00:00.000Z");
  assert.equal(result.status, "available");
  assert.equal(result.inferences[0].confidence.score, 82);
  assert.equal(result.inferences[0].confidence.calibration, "uncalibrated_model_estimate");
  assert.deepEqual(result.inferences[0].confidence.evidenceIds, ["memory-1", "current_input"]);
  assert.ok(!result.answer.includes("inference_ledger"));
});

test("removes unknown evidence references and reports the issue", () => {
  const response = '<inference_ledger>[{"claim":"A claim","confidenceScore":70,"evidenceIds":["memory-1","nexus-assertion-9"],"uncertaintyFactors":[]}]</inference_ledger>';
  const result = parseInferenceLedger(response, ["memory-1"]);
  assert.deepEqual(result.inferences[0].confidence.evidenceIds, ["memory-1"]);
  assert.ok(result.issues.includes("unknown_evidence_reference_removed"));
});

test("malformed or missing ledgers fail visibly without fabricated scores", () => {
  const missing = parseInferenceLedger("A plain answer.", []);
  assert.equal(missing.status, "unavailable");
  assert.equal(missing.inferences.length, 0);
  const malformed = parseInferenceLedger("<inference_ledger>not-json</inference_ledger>", []);
  assert.equal(malformed.status, "invalid");
  assert.equal(malformed.inferences.length, 0);
});
