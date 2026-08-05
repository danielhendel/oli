/**
 * Extraction consensus — exact agreement only.
 */
import { describe, expect, it } from "@jest/globals";
import {
  evaluateLabExtractionConsensus,
  type LabExtractionStrategyCandidate,
} from "../evaluateLabExtractionConsensus";

function cand(
  partial: Partial<LabExtractionStrategyCandidate> & Pick<LabExtractionStrategyCandidate, "strategyId">,
): LabExtractionStrategyCandidate {
  return {
    strategyId: partial.strategyId,
    analyteMetricId: partial.analyteMetricId ?? "hba1c",
    result: partial.result ?? { kind: "numeric", value: 5.6, comparator: "eq" },
    normalizedUnit: partial.normalizedUnit ?? "%",
    unitRequired: partial.unitRequired ?? true,
    page: partial.page ?? 3,
  };
}

describe("evaluateLabExtractionConsensus", () => {
  it("returns consensus when both strategies agree", () => {
    const decision = evaluateLabExtractionConsensus(
      cand({ strategyId: "positional" }),
      cand({ strategyId: "text_sequence" }),
    );
    expect(decision.status).toBe("consensus");
    if (decision.status === "consensus") {
      expect(decision.analyteMetricId).toBe("hba1c");
      expect(decision.normalizedUnit).toBe("%");
      expect(decision.page).toBe(3);
    }
  });

  it("withholds on analyte disagreement", () => {
    const decision = evaluateLabExtractionConsensus(
      cand({ strategyId: "a", analyteMetricId: "hba1c" }),
      cand({ strategyId: "b", analyteMetricId: "hemoglobin" }),
    );
    expect(decision.status).toBe("conflict");
    if (decision.status === "conflict") expect(decision.reasons).toContain("analyte_disagreement");
  });

  it("withholds on value disagreement", () => {
    const decision = evaluateLabExtractionConsensus(
      cand({ strategyId: "a", result: { kind: "numeric", value: 5.6, comparator: "eq" } }),
      cand({ strategyId: "b", result: { kind: "numeric", value: 5.7, comparator: "eq" } }),
    );
    expect(decision.status).toBe("conflict");
    if (decision.status === "conflict") expect(decision.reasons).toContain("value_disagreement");
  });

  it("withholds on unit disagreement", () => {
    const decision = evaluateLabExtractionConsensus(
      cand({ strategyId: "a", normalizedUnit: "%" }),
      cand({ strategyId: "b", normalizedUnit: "Hgb" }),
    );
    expect(decision.status).toBe("conflict");
    if (decision.status === "conflict") expect(decision.reasons).toContain("unit_disagreement");
  });

  it("withholds on page disagreement", () => {
    const decision = evaluateLabExtractionConsensus(
      cand({ strategyId: "a", page: 1 }),
      cand({ strategyId: "b", page: 2 }),
    );
    expect(decision.status).toBe("conflict");
    if (decision.status === "conflict") expect(decision.reasons).toContain("page_disagreement");
  });

  it("returns insufficient when a strategy is incomplete", () => {
    const decision = evaluateLabExtractionConsensus(
      {
        strategyId: "a",
        analyteMetricId: null,
        result: null,
        normalizedUnit: null,
        unitRequired: true,
        page: null,
      },
      cand({ strategyId: "b" }),
    );
    expect(decision.status).toBe("insufficient");
  });
});