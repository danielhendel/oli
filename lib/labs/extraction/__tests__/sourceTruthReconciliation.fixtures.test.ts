/**
 * Source-of-truth reconciliation fixtures (de-identified synthetic structures).
 * No private Report A values.
 */
import { describe, expect, it } from "@jest/globals";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import { parseColumnsForTest } from "../extractQuestAnalyteRows";
import { refineLabMetricIdWithContext } from "../../resolution/refineLabMetricIdWithContext";
import { matchLabAnalyteAlias } from "../matchLabAnalyteAlias";
import { formatLabResultValue } from "../../labMetricCatalog";
import { selectRepresentativeLabResult } from "../../history/selectRepresentativeLabResult";
import { calculateLabMetricChange } from "../../history/calculateLabMetricChange";
import { evaluateLabTrendEligibility } from "../../history/evaluateLabTrendEligibility";
import { parseLabResultValue } from "../parseLabResultValue";

const checksum = "a".repeat(64);

const QUEST_HEADER = [
  "Quest Diagnostics",
  "DirectLabs Laboratory Report",
  "Report Status: FINAL",
  "Collected: 10/15/2024 08:30 AM",
  "Reported: 10/16/2024 09:00 AM",
  "Fasting: Yes",
  "LIPID PANEL",
  "",
].join("\n");

function draftFromText(text: string, pageNumber = 1) {
  return extractQuestLabReportDraft({
    documentId: "doc_sot",
    userId: "user_sot",
    draftId: "draft_sot",
    checksumSha256: checksum,
    pages: [{ pageNumber, text: `${QUEST_HEADER}${text}` }],
    createdAt: "2024-10-15T12:00:00.000Z",
  });
}

describe("source-truth Cardio IQ column selection", () => {
  it("does not treat optimal/high threshold-only rows as current results", () => {
    const parsed = parseColumnsForTest("CHOLESTEROL, TOTAL <200 mg/dL >=240 mg/dL");
    expect(parsed).toBeNull();
  });

  it("selects equality current result before reference inequality on detail rows", () => {
    const parsed = parseColumnsForTest("CHOLESTEROL, TOTAL 179 <200 mg/dL");
    expect(parsed).not.toBeNull();
    expect(parsed!.rawResult).toBe("179");
    expect(parsed!.rawUnit).toBe("mg/dL");
    expect(parsed!.rawRange).toContain("<200");
  });

  it("imports detail-page equality values over summary threshold duplicates", () => {
    const text = [
      "CARDIO IQ®",
      "CHOLESTEROL, TOTAL <200 mg/dL >=240 mg/dL",
      "LDL-CHOLESTEROL <100 mg/dL >160 mg/dL",
      "HDL CHOLESTEROL >=40 mg/dL",
      "TRIGLYCERIDES <150 mg/dL >=200 mg/dL",
      "CHOLESTEROL, TOTAL 179 <200 mg/dL",
      "LDL-CHOLESTEROL 101 <100 mg/dL",
      "HDL CHOLESTEROL 62 >40 mg/dL",
      "TRIGLYCERIDES 72 <150 mg/dL",
    ].join("\n");
    const draft = draftFromText(text);
    const byId = Object.fromEntries(
      draft.results.map((r) => [r.aliasMatch.canonicalMetricId, r]),
    );
    expect(byId.total_cholesterol?.result).toEqual({
      kind: "numeric",
      value: 179,
      comparator: "eq",
    });
    expect(byId.ldl_c?.result).toEqual({ kind: "numeric", value: 101, comparator: "eq" });
    expect(byId.hdl_c?.result).toEqual({ kind: "numeric", value: 62, comparator: "eq" });
    expect(byId.triglycerides?.result).toEqual({ kind: "numeric", value: 72, comparator: "eq" });
  });

  it("keeps LDL Pattern B as a qualitative pattern result", () => {
    const draft = draftFromText("LDL PATTERN B");
    const pattern = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "ldl_pattern");
    expect(pattern?.result).toEqual({ kind: "pattern", value: "Pattern B" });
  });

  it("reconstructs Lp-PLA2 activity unit nmol/min/mL", () => {
    const draft = draftFromText("LP-PLA2 ACTIVITY 95 nmol/min/mL");
    const row = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "lp_pla2");
    expect(row?.result).toEqual({ kind: "numeric", value: 95, comparator: "eq" });
    expect(row?.unit.normalizedUnit).toBe("nmol/min/mL");
  });
});

describe("source-truth IL-6 / iron / specimen / comparator", () => {
  it("does not parse analyte-name 6 as Interleukin-6 result", () => {
    const parsed = parseColumnsForTest("INTERLEUKIN 6 (IL 6), IA");
    expect(parsed).toBeNull();
  });

  it("parses Interleukin-6 result row with pg/mL", () => {
    const draft = draftFromText("INTERLEUKIN-6 1.89 pg/mL");
    const row = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "interleukin_6");
    expect(row?.result).toEqual({ kind: "numeric", value: 1.89, comparator: "eq" });
    expect(row?.unit.normalizedUnit).toBe("pg/mL");
  });

  it("joins Interleukin-6 name line with following SERUM result row", () => {
    const draft = draftFromText("INTERLEUKIN 6 (IL 6), IA\nSERUM 1.89 <5.0 pg/mL");
    const row = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "interleukin_6");
    expect(row?.result).toEqual({ kind: "numeric", value: 1.89, comparator: "eq" });
    expect(row?.unit.normalizedUnit).toBe("pg/mL");
  });

  it("keeps a single inequality as a current censored result (mercury-style)", () => {
    const parsed = parseColumnsForTest("MERCURY, BLOOD <4 <=4 mcg/L");
    expect(parsed?.rawResult).toBe("<4");
    expect(parsed?.rawUnit).toBe("mcg/L");
  });

  it("maps OSMOLALITY (U) to urine_osmolality not serum", () => {
    const alias = matchLabAnalyteAlias("OSMOLALITY (U)");
    const refined = refineLabMetricIdWithContext({
      metricId: alias.canonicalMetricId,
      rawLabel: "OSMOLALITY (U)",
      normalizedUnit: "mOsm/kg",
      rawUnit: "mOsm/kg",
    });
    expect(refined).toBe("osmolality_urine");
  });

  it("preserves mercury inequality comparator in structured result and display", () => {
    const parsed = parseLabResultValue("<4");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({ kind: "numeric", value: 4, comparator: "lt" });
    expect(
      formatLabResultValue(4, "ug/L", { rawValueText: "<4", comparator: "lt" }),
    ).toBe("<4 ug/L");
    expect(formatLabResultValue(4, "ug/L", { rawValueText: "<4" })).toBe("<4 ug/L");
  });

  it("extracts IRON, TOTAL instead of treating iron as a panel header", () => {
    const draft = draftFromText("IRON, TOTAL 174 mcg/dL");
    const iron = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "iron");
    expect(iron?.result).toEqual({ kind: "numeric", value: 174, comparator: "eq" });
    expect(iron?.unit.normalizedUnit).toBe("ug/dL");
  });
});

describe("panel-aware albumin and history foundation", () => {
  it("preserves hormone and CMP albumin as distinct current results", () => {
    const text = [
      "TESTOSTERONE, BIOAVAILABLE",
      "ALBUMIN 4.2 3.6-5.1 g/dL",
      "COMPREHENSIVE METABOLIC PANEL",
      "ALBUMIN 4.1 3.6-5.1 g/dL",
    ].join("\n");
    const draft = draftFromText(text);
    const albumins = draft.results.filter((r) => r.aliasMatch.canonicalMetricId === "albumin");
    expect(albumins.length).toBe(2);
    const values = albumins
      .map((r) => (r.result?.kind === "numeric" ? r.result.value : null))
      .sort();
    expect(values).toEqual([4.1, 4.2]);
  });

  it("Liver/CMP representative policy prefers CMP albumin", () => {
    const selected = selectRepresentativeLabResult({
      metricId: "albumin",
      candidates: [
        {
          id: "a_hormone",
          canonicalMetricId: "albumin",
          panelName: "TESTOSTERONE, BIOAVAILABLE",
          collectedAt: "2024-10-15T00:00:00.000Z",
          result: { kind: "numeric", value: 4.2, comparator: "eq" },
          normalizedUnit: "g/dL",
          sourcePage: 1,
        },
        {
          id: "a_cmp",
          canonicalMetricId: "albumin",
          panelName: "COMPREHENSIVE METABOLIC PANEL",
          collectedAt: "2024-10-15T00:00:00.000Z",
          result: { kind: "numeric", value: 4.1, comparator: "eq" },
          normalizedUnit: "g/dL",
          sourcePage: 1,
        },
      ],
      policy: {
        preferredPanels: ["COMPREHENSIVE METABOLIC PANEL", "CMP"],
        measuredPreference: "measured_first",
      },
    });
    expect(selected?.id).toBe("a_cmp");
  });

  it("calculates neutral absolute and percent change without interpretation", () => {
    const change = calculateLabMetricChange({
      latest: {
        id: "late",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 88, comparator: "eq" },
      },
      prior: {
        id: "prior",
        collectedAt: "2022-07-07T00:00:00.000Z",
        result: { kind: "numeric", value: 100, comparator: "eq" },
      },
    });
    expect(change).toEqual({
      latestResultId: "late",
      priorResultId: "prior",
      absoluteChange: -12,
      percentChange: -12,
      latestCollectedAt: "2024-10-15T00:00:00.000Z",
      priorCollectedAt: "2022-07-07T00:00:00.000Z",
      direction: "decreased",
      interpretation: null,
    });
  });

  it("marks inequalities and patterns as table-only for trends", () => {
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "numeric", comparator: "lt" },
        normalizedUnit: "ug/L",
        specimenType: "whole_blood",
        collectedAt: "2024-10-15T00:00:00.000Z",
      }),
    ).toBe("inequality_table_only");
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "pattern" },
        normalizedUnit: "none",
        specimenType: "serum",
        collectedAt: "2024-10-15T00:00:00.000Z",
      }),
    ).toBe("pattern");
  });
});
