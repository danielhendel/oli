import { calculateLabMetricChange, formatLabMetricChangeCopy } from "../calculateLabMetricChange";
import { deduplicateLabHistorySourceRepresentations } from "../deduplicateLabHistorySourceRepresentations";
import {
  buildLabHistoryCompatibilityGroup,
  evaluateLabTrendEligibility,
  sortLabHistoryByCollectionDate,
} from "../evaluateLabTrendEligibility";
import { selectRepresentativeLabResult } from "../selectRepresentativeLabResult";
import { reconcileLabSourceTruth } from "../../reconciliation/reconcileLabSourceTruth";

describe("labs history foundation", () => {
  it("orders history by collectedAt descending and ignores upload order", () => {
    const sorted = sortLabHistoryByCollectionDate([
      { id: "a", collectedAt: "2020-06-05T00:00:00.000Z" },
      { id: "b", collectedAt: "2024-10-15T00:00:00.000Z" },
      { id: "c", collectedAt: "2022-07-07T00:00:00.000Z" },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("builds compatibility groups that separate specimen", () => {
    const serum = buildLabHistoryCompatibilityGroup({
      canonicalMetricId: "osmolality_serum",
      normalizedUnit: "mOsm/kg",
      specimenType: "serum",
      measuredOrCalculated: "measured",
    });
    const urine = buildLabHistoryCompatibilityGroup({
      canonicalMetricId: "osmolality_urine",
      normalizedUnit: "mOsm/kg",
      specimenType: "urine",
      measuredOrCalculated: "measured",
    });
    expect(serum).not.toBe(urine);
  });

  it("marks inequalities and patterns as table-only", () => {
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "numeric", comparator: "lt" },
        normalizedUnit: "ug/L",
        collectedAt: "2024-10-15T00:00:00.000Z",
      }),
    ).toBe("inequality_table_only");
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "pattern" },
        normalizedUnit: "none",
        collectedAt: "2024-10-15T00:00:00.000Z",
      }),
    ).toBe("pattern");
  });

  it("calculates neutral change without interpretation language", () => {
    const change = calculateLabMetricChange({
      latest: {
        id: "l",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 112, comparator: "eq" },
      },
      prior: {
        id: "p",
        collectedAt: "2022-07-07T00:00:00.000Z",
        result: { kind: "numeric", value: 100, comparator: "eq" },
      },
    });
    expect(change?.direction).toBe("increased");
    expect(change?.interpretation).toBeNull();
    const copy = formatLabMetricChangeCopy({ change: change!, unit: "mg/dL" });
    expect(copy.toLowerCase()).not.toMatch(/improv|worsen|better|worse|risk/);
    expect(copy).toMatch(/Increased/);
  });

  it("deduplicates agreeing source representations preferring later pages", () => {
    const out = deduplicateLabHistorySourceRepresentations([
      {
        id: "p6",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-10-15T00:00:00.000Z",
        panelId: "cardio",
        specimenType: "serum",
        methodId: null,
        sourcePage: 6,
        sourceLocator: "p6:L1",
        resultFingerprint: "eq:101",
      },
      {
        id: "p9",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-10-15T00:00:00.000Z",
        panelId: "cardio",
        specimenType: "serum",
        methodId: null,
        sourcePage: 9,
        sourceLocator: "p9:L1",
        resultFingerprint: "eq:101",
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("p9");
  });

  it("selects CMP albumin as representative without dropping hormone row from input", () => {
    const candidates = [
      {
        id: "hormone",
        canonicalMetricId: "albumin",
        panelName: "BIOAVAILABLE",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 4.2, comparator: "eq" as const },
      },
      {
        id: "cmp",
        canonicalMetricId: "albumin",
        panelName: "COMPREHENSIVE METABOLIC",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 4.1, comparator: "eq" as const },
      },
    ];
    const rep = selectRepresentativeLabResult({ metricId: "albumin", candidates });
    expect(rep?.id).toBe("cmp");
    expect(candidates).toHaveLength(2);
  });

  it("reconciliation guard detects comparator loss", () => {
    const r = reconcileLabSourceTruth({
      candidateId: "c1",
      metricId: "mercury_blood",
      panelId: null,
      specimenType: "whole_blood",
      sourceResult: { kind: "numeric", value: 4, comparator: "lt" },
      sourceUnit: "ug/L",
      acceptedResult: { kind: "numeric", value: 4, comparator: "eq" },
      acceptedUnit: "ug/L",
      displayedResult: { kind: "numeric", value: 4, comparator: "eq" },
      displayedUnit: "ug/L",
    });
    expect(r.status).toBe("wrong_comparator");
    expect(r.safeReasonCode).toBe("comparator_lost");
  });
});
