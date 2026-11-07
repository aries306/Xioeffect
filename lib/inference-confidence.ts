export type InferenceConfidence = {
  score: number;
  calibration: "uncalibrated_model_estimate";
  method: "model_self_assessment_v1";
  evidenceIds: string[];
  uncertaintyFactors: string[];
  assessedAt: string;
};

export type InferenceRecord = {
  claim: string;
  confidence: InferenceConfidence;
};

export type InferenceLedgerResult = {
  answer: string;
  inferences: InferenceRecord[];
  status: "available" | "unavailable" | "invalid";
  issues: string[];
};

function uniqueStrings(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))].slice(0, max);
}

/**
 * Parses the model's explicit inference ledger. Scores are intentionally marked
 * uncalibrated until validated against observed outcomes; they are not presented
 * as statistical probabilities.
 */
export function parseInferenceLedger(
  response: string,
  allowedEvidenceIds: string[],
  assessedAt = new Date().toISOString(),
): InferenceLedgerResult {
  const match = response.match(/<inference_ledger>\s*([\s\S]*?)\s*<\/inference_ledger>/i);
  if (!match) {
    return { answer: response.trim(), inferences: [], status: "unavailable", issues: ["inference_ledger_missing"] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return {
      answer: response.replace(match[0], "").trim(),
      inferences: [],
      status: "invalid",
      issues: ["inference_ledger_invalid_json"],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      answer: response.replace(match[0], "").trim(),
      inferences: [],
      status: "invalid",
      issues: ["inference_ledger_must_be_an_array"],
    };
  }

  const allowed = new Set([...allowedEvidenceIds, "current_input"]);
  const issues: string[] = [];
  const inferences: InferenceRecord[] = [];

  for (const raw of parsed.slice(0, 24)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      issues.push("inference_entry_not_an_object");
      continue;
    }
    const item = raw as Record<string, unknown>;
    const claim = typeof item.claim === "string" ? item.claim.trim().slice(0, 600) : "";
    const score = item.confidenceScore;
    if (!claim || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
      issues.push("inference_entry_missing_claim_or_valid_confidence");
      continue;
    }
    const requestedEvidence = uniqueStrings(item.evidenceIds);
    const evidenceIds = requestedEvidence.filter((id) => allowed.has(id));
    if (evidenceIds.length !== requestedEvidence.length) issues.push("unknown_evidence_reference_removed");
    const uncertaintyFactors = uniqueStrings(item.uncertaintyFactors, 10);
    inferences.push({
      claim,
      confidence: {
        score: Math.round(score),
        calibration: "uncalibrated_model_estimate",
        method: "model_self_assessment_v1",
        evidenceIds,
        uncertaintyFactors,
        assessedAt,
      },
    });
  }

  return {
    answer: response.replace(match[0], "").trim(),
    inferences,
    status: parsed.length === 0 || inferences.length > 0 ? "available" : "invalid",
    issues,
  };
}
