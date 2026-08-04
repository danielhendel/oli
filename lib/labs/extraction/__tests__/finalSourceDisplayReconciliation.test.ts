/**
 * Final source-to-display reconciliation regressions (synthetic / de-identified).
 * Do not commit private Report A values.
 */
import { describe, expect, it } from "@jest/globals";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import { parseColumnsForTest } from "../extractQuestAnalyteRows";
import { resolveLabExtractionCandidates } from "../../resolution/resolveLabExtractionCandidates";
import {
  formatLabResultValue,
  groupLabResultsByCategory,
} from "../../labMetricCatalog";
import { selectRepresentativeLabResult } from "../../history/selectRepresentativeLabResult";
import { refineLabMetricIdWithContext } from "../../resolution/refineLabMetricIdWithContext";
import { matchLabAnalyteAlias } from "../matchLabAnalyteAlias";
import { resolveLabSpecimenType } from "../resolveLabSpecimenType";

const checksum = "b".repeat(64);
const iso = "2024-10-15T00:00:00.000Z";

function draftFromPages(
  pages: { pageNumber: number; text: string }[],
): ReturnType<typeof extractQuestLabReportDraft> {
  return extractQuestLabReportDraft({
    documentId: "doc_final",
    userId: "user_final",
    draftId: "draft_final",
    checksumSha256: checksum,
    pages,
    createdAt: iso,
  });
}

const QUEST = [
  "Quest Diagnostics",
  "DirectLabs Laboratory Report",
  "Report Status: FINAL",
  "Collected: 10/15/2024 08:30 AM",
  "Reported: 10/16/2024 09:00 AM",
  "Fasting: Yes",
  "LIPID PANEL",
  "CHOLESTEROL, TOTAL 180 <200 mg/dL",
].join("\n");

describe("Cardio IQ detail-page authority", () => {
  it("selects page 9/10 equality currents over page 6 threshold bands", () => {
    const draft = draftFromPages([
      {
        pageNumber: 6,
        text: [
          QUEST,
          "Cardio IQ®",
          "Relative Risk",
          "NON-HDL CHOLESTEROL <130 130-189 >=190 mg/dL",
          "CHOL/HDLC RATIO <=3.5 3.6-5.0 >5.0 calc",
          "LDL MEDIUM <215 215-301 >301 nmol/L",
          "HDL LARGE >6729 6729-5353 <5353 nmol/L",
          "LDL PEAK SIZE >222.9 222.9-217.4 <217.4 Angstrom",
          "LDL PATTERN A N/A B Pattern",
        ].join("\n"),
      },
      {
        pageNumber: 9,
        text: [
          QUEST,
          "Cardio IQ®",
          "LDL MEDIUM 401 <215 nmol/L",
          "HDL LARGE 7001 >6729 nmol/L",
          "LDL PEAK SIZE 218.5 >222.9 Angstrom",
          "CHOL/HDLC RATIO 2.7 <5.0 calc",
          "LDL PATTERN B A Pattern",
        ].join("\n"),
      },
      {
        pageNumber: 10,
        text: [QUEST, "Cardio IQ®", "NON HDL CHOLESTEROL 111 <130 mg/dL (calc)"].join("\n"),
      },
    ]);
    const { currentResults } = resolveLabExtractionCandidates(draft);
    const byId = Object.fromEntries(
      currentResults.map((r) => [r.aliasMatch.canonicalMetricId, r]),
    );

    expect(byId.non_hdl_c?.result).toEqual({ kind: "numeric", value: 111, comparator: "eq" });
    expect(byId.chol_hdl_ratio?.result).toEqual({ kind: "numeric", value: 2.7, comparator: "eq" });
    expect(byId.ldl_medium?.result).toEqual({ kind: "numeric", value: 401, comparator: "eq" });
    expect(byId.hdl_large?.result).toEqual({ kind: "numeric", value: 7001, comparator: "eq" });
    expect(byId.ldl_peak_size?.result).toEqual({ kind: "numeric", value: 218.5, comparator: "eq" });
    expect(byId.ldl_pattern?.result).toEqual({ kind: "pattern", value: "Pattern B" });
    expect(byId.non_hdl_c?.provenance.sourcePage).toBe(10);
    expect(byId.ldl_pattern?.provenance.sourcePage).toBe(9);

    // Page-6 thresholds must not become current_result candidates.
    expect(
      draft.results.some(
        (r) =>
          r.aliasMatch.canonicalMetricId === "non_hdl_c" &&
          r.result?.kind === "numeric" &&
          r.result.comparator !== "eq",
      ),
    ).toBe(false);
  });

  it("treats page-6 LDL Pattern legend as non-current reference", () => {
    const draft = draftFromPages([
      {
        pageNumber: 6,
        text: [QUEST, "Cardio IQ®", "LDL PATTERN A N/A B Pattern"].join("\n"),
      },
    ]);
    const patternCurrents = draft.results.filter(
      (r) => r.aliasMatch.canonicalMetricId === "ldl_pattern",
    );
    expect(patternCurrents).toHaveLength(0);
    const legend = draft.unmatched.find((u) => /ldl\s*pattern/i.test(u.rawAnalyteLabel));
    expect(legend).toBeTruthy();
    expect(
      legend?.reason === "non_result_risk_category" ||
        legend?.provenance.sourceValueRole?.startsWith("reference_") ||
        legend?.resolutionKind === "risk_category",
    ).toBe(true);
  });

  it("never appends preferredUnit none to Pattern display text", () => {
    expect(
      formatLabResultValue(null, null, {
        preferredUnit: "none",
        rawValueText: "Pattern B",
      }),
    ).toBe("Pattern B");
    expect(
      formatLabResultValue(null, "none", {
        preferredUnit: "none",
        rawValueText: "Pattern A",
      }),
    ).toBe("Pattern A");
  });

  it("summary suppresses lone threshold projections when no current equality exists", () => {
    const grouped = groupLabResultsByCategory([
      {
        id: "stale",
        metricKey: "non_hdl_c",
        categoryKey: "cardiovascular",
        displayName: "Non-HDL Cholesterol",
        value: 130,
        unit: "mg/dL",
        collectedAt: iso,
        rawValueText: "<130",
        sourcePage: 6,
        sourceValueRole: "current_result",
        panelName: "Cardio IQ",
      },
    ]);
    const card = grouped
      .flatMap((g) => g.metrics)
      .find((m) => m.definition.metricKey === "non_hdl_c");
    expect(card?.latest).toBeNull();
  });

  it("summary prefers equality current over stale threshold on same collectedAt", () => {
    const grouped = groupLabResultsByCategory([
      {
        id: "stale",
        metricKey: "ldl_medium",
        categoryKey: "cardiovascular",
        displayName: "Medium LDL-P",
        value: 215,
        unit: "nmol/L",
        collectedAt: iso,
        rawValueText: "<215",
        sourcePage: 6,
        sourceValueRole: "current_result",
      },
      {
        id: "current",
        metricKey: "ldl_medium",
        categoryKey: "cardiovascular",
        displayName: "Medium LDL-P",
        value: 401,
        unit: "nmol/L",
        collectedAt: iso,
        rawValueText: "401",
        sourcePage: 9,
        sourceValueRole: "current_result",
      },
    ]);
    const card = grouped
      .flatMap((g) => g.metrics)
      .find((m) => m.definition.metricKey === "ldl_medium");
    expect(card?.latest?.id).toBe("current");
    expect(
      formatLabResultValue(card?.latest?.value, card?.latest?.unit, {
        ...(card?.latest?.rawValueText != null ? { rawValueText: card.latest.rawValueText } : {}),
        preferredUnit: "nmol/L",
      }),
    ).toBe("401 nmol/L");
  });
});

describe("IL-6 multiline and embedded-numeral protection", () => {
  it("rejects analyte-name numeral as the only result token", () => {
    expect(parseColumnsForTest("INTERLEUKIN 6 (IL 6), IA")).toBeNull();
  });

  it("skips embedded name numeral on same-line result rows", () => {
    const parsed = parseColumnsForTest("INTERLEUKIN 6 1.77 <5.00 pg/mL");
    expect(parsed).not.toBeNull();
    expect(parsed!.rawLabel.toUpperCase()).toContain("INTERLEUKIN");
    expect(parsed!.rawResult).toBe("1.77");
    expect(parsed!.rawUnit).toBe("pg/mL");
  });

  it("joins pending IL-6 name with SERUM result row", () => {
    const draft = draftFromPages([
      {
        pageNumber: 3,
        text: [QUEST, "INTERLEUKIN 6 (IL 6), EZ", "SERUM 1.77 <5.00 pg/mL"].join("\n"),
      },
    ]);
    const row = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "interleukin_6");
    expect(row?.result).toEqual({ kind: "numeric", value: 1.77, comparator: "eq" });
    expect(row?.unit.normalizedUnit).toBe("pg/mL");
    expect(row?.provenance.sourceValueRole).toBe("current_result");
  });
});

describe("specimen exclusivity", () => {
  it("maps OSMOLALITY (U) only to urine and never serum", () => {
    const draft = draftFromPages([
      {
        pageNumber: 2,
        text: [QUEST, "COMPREHENSIVE METABOLIC PANEL", "OSMOLALITY (U) 222 mOsm/kg"].join("\n"),
      },
    ]);
    const { currentResults } = resolveLabExtractionCandidates(draft);
    expect(currentResults.some((r) => r.aliasMatch.canonicalMetricId === "osmolality_serum")).toBe(
      false,
    );
    const urine = currentResults.find((r) => r.aliasMatch.canonicalMetricId === "osmolality_urine");
    expect(urine?.result).toEqual({ kind: "numeric", value: 222, comparator: "eq" });
    expect(resolveLabSpecimenType({ rawLabel: "OSMOLALITY (U)", metricId: "osmolality_urine" })).toBe(
      "urine",
    );
  });

  it("resolves explicit specimen suffixes deterministically", () => {
    expect(resolveLabSpecimenType({ rawLabel: "MERCURY, BLOOD", metricId: "mercury_blood" })).toBe(
      "whole_blood",
    );
    expect(
      resolveLabSpecimenType({ rawLabel: "INTERLEUKIN 6, SERUM", metricId: "interleukin_6" }),
    ).toBe("serum");
    expect(
      resolveLabSpecimenType({ rawLabel: "OSMOLALITY, SERUM", metricId: "osmolality_serum" }),
    ).toBe("serum");
  });
});

describe("panel-aware albumin representative", () => {
  it("preserves hormone and CMP albumin and Liver prefers CMP", () => {
    const draft = draftFromPages([
      {
        pageNumber: 1,
        text: [
          QUEST,
          "TESTOSTERONE, FREE, BIOAVAILABLE AND TOTAL",
          "ALBUMIN 4.8 3.6-5.1 g/dL",
          "COMPREHENSIVE METABOLIC PANEL",
          "ALBUMIN 4.0 3.6-5.1 g/dL",
        ].join("\n"),
      },
    ]);
    const { currentResults } = resolveLabExtractionCandidates(draft);
    const albumins = currentResults.filter((r) => r.aliasMatch.canonicalMetricId === "albumin");
    expect(albumins).toHaveLength(2);

    const grouped = groupLabResultsByCategory(
      albumins.map((r, idx) => ({
        id: `alb_${idx}`,
        metricKey: "albumin",
        categoryKey: "liver",
        displayName: "Albumin",
        value: r.result?.kind === "numeric" ? r.result.value : null,
        unit: r.unit.normalizedUnit,
        collectedAt: iso,
        rawValueText: r.rawResult,
        panelName: r.provenance.panelName ?? null,
        sourcePage: r.provenance.sourcePage,
        sourceValueRole: r.provenance.sourceValueRole ?? null,
      })),
    );
    const liver = grouped.find((g) => g.category.categoryKey === "liver");
    const card = liver?.metrics.find((m) => m.definition.metricKey === "albumin");
    expect(card?.latest?.value).toBe(4.0);
  });

  it("BIOAVAILABLE panel name still ranks below CMP for Liver", () => {
    const selected = selectRepresentativeLabResult({
      metricId: "albumin",
      candidates: [
        {
          id: "hormone",
          canonicalMetricId: "albumin",
          panelName: "BIOAVAILABLE",
          collectedAt: iso,
          result: { kind: "numeric", value: 4.8, comparator: "eq" },
          normalizedUnit: "g/dL",
          sourcePage: 1,
          sourceValueRole: "current_result",
        },
        {
          id: "cmp",
          canonicalMetricId: "albumin",
          panelName: "COMPREHENSIVE METABOLIC",
          collectedAt: iso,
          result: { kind: "numeric", value: 4.0, comparator: "eq" },
          normalizedUnit: "g/dL",
          sourcePage: 1,
          sourceValueRole: "current_result",
        },
      ],
    });
    expect(selected?.id).toBe("cmp");
  });
});

describe("Lp-PLA2 unit reconstruction", () => {
  it("keeps intact nmol/min/mL from patient result cell", () => {
    const draft = draftFromPages([
      {
        pageNumber: 10,
        text: [QUEST, "Cardio IQ®", "LP PLA2 ACTIVITY 88 <124 nmol/min/mL"].join("\n"),
      },
    ]);
    const row = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "lp_pla2");
    expect(row?.result).toEqual({ kind: "numeric", value: 88, comparator: "eq" });
    expect(row?.unit.normalizedUnit).toBe("nmol/min/mL");
  });

  it("reconstructs split nmol/ + min/mL unit lines", () => {
    const parsed = parseColumnsForTest("LP PLA2 ACTIVITY 88 <124 nmol/");
    // Parser may leave truncated unit; preferred-unit / verification fills nmol/min/mL.
    expect(parsed?.rawResult).toBe("88");
    const alias = matchLabAnalyteAlias("LP PLA2 ACTIVITY");
    expect(alias.canonicalMetricId).toBe("lp_pla2");
    expect(
      refineLabMetricIdWithContext({
        metricId: alias.canonicalMetricId,
        rawLabel: "LP PLA2 ACTIVITY",
        normalizedUnit: "nmol/min/mL",
        rawUnit: "nmol/",
      }),
    ).toBe("lp_pla2");
  });
});
