/**
 * Independent extraction consensus — exact agreement required; never average conflicts.
 */
import type { LabResultValue } from "@oli/contracts";

export const LAB_EXTRACTION_CONSENSUS_EVIDENCE_VERSION = "1.0.0" as const;

export type LabExtractionStrategyCandidate = {
  strategyId: string;
  analyteMetricId: string | null;
  result: LabResultValue | null;
  normalizedUnit: string | null;
  unitRequired: boolean;
  page: number | null;
};

export type LabExtractionConsensusDecision =
  | {
      status: "consensus";
      analyteMetricId: string;
      result: LabResultValue;
      normalizedUnit: string | null;
      page: number;
      evidenceVersion: typeof LAB_EXTRACTION_CONSENSUS_EVIDENCE_VERSION;
      strategies: readonly string[];
    }
  | {
      status: "conflict";
      reasons: readonly string[];
      evidenceVersion: typeof LAB_EXTRACTION_CONSENSUS_EVIDENCE_VERSION;
    }
  | {
      status: "insufficient";
      reasons: readonly string[];
      evidenceVersion: typeof LAB_EXTRACTION_CONSENSUS_EVIDENCE_VERSION;
    };

function resultKey(result: LabResultValue | null): string | null {
  if (!result) return null;
  if (result.kind === "numeric") {
    return `numeric:${result.comparator}:${result.value}`;
  }
  return `${result.kind}:${JSON.stringify(result)}`;
}

/**
 * Compare two independent extraction strategies.
 * Requires exact agreement on analyte, result kind/comparator/value, unit (when required), and page.
 */
export function evaluateLabExtractionConsensus(
  a: LabExtractionStrategyCandidate,
  b: LabExtractionStrategyCandidate,
): LabExtractionConsensusDecision {
  const evidenceVersion = LAB_EXTRACTION_CONSENSUS_EVIDENCE_VERSION;

  if (!a.analyteMetricId || !a.result || a.page == null) {
    return { status: "insufficient", reasons: ["strategy_a_incomplete"], evidenceVersion };
  }
  if (!b.analyteMetricId || !b.result || b.page == null) {
    return { status: "insufficient", reasons: ["strategy_b_incomplete"], evidenceVersion };
  }

  const reasons: string[] = [];
  if (a.analyteMetricId !== b.analyteMetricId) reasons.push("analyte_disagreement");
  if (resultKey(a.result) !== resultKey(b.result)) reasons.push("value_disagreement");
  if (a.page !== b.page) reasons.push("page_disagreement");

  const unitRequired = a.unitRequired || b.unitRequired;
  if (unitRequired) {
    if (!a.normalizedUnit || !b.normalizedUnit) reasons.push("unit_insufficient");
    else if (a.normalizedUnit !== b.normalizedUnit) reasons.push("unit_disagreement");
  } else if (a.normalizedUnit && b.normalizedUnit && a.normalizedUnit !== b.normalizedUnit) {
    reasons.push("unit_disagreement");
  }

  if (reasons.length > 0) {
    return { status: "conflict", reasons, evidenceVersion };
  }

  return {
    status: "consensus",
    analyteMetricId: a.analyteMetricId,
    result: a.result,
    normalizedUnit: a.normalizedUnit ?? b.normalizedUnit,
    page: a.page,
    evidenceVersion,
    strategies: [a.strategyId, b.strategyId],
  };
}
