/**
 * Reproduce June 2020 Total Cholesterol contamination by Chol/HDL ratio (3.5).
 *
 * Root cause under test:
 * 1) ALL-CAPS "CHOLESTEROL, TOTAL" falsely skipped as patient identity;
 * 2) bare "CHOLESTEROL" alias remaps ratio fragments onto total_cholesterol.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import { matchLabAnalyteAlias } from "../matchLabAnalyteAlias";
import { buildLabTrendSeries } from "../../history/buildLabTrendSeries";
import type { LabHistoryPointDto } from "@oli/contracts";

const CHECKSUM = "f".repeat(64);
const CREATED_AT = "2026-08-07T16:00:00.000Z";

function loadFixture(name: string): string {
  return readFileSync(path.join(__dirname, "..", "__fixtures__", `${name}.txt`), "utf8");
}

function draftFor(name: string) {
  return extractQuestLabReportDraft({
    documentId: "doc_2020_allcaps",
    userId: "uid_hist",
    draftId: "draft_2020_allcaps",
    checksumSha256: CHECKSUM,
    pages: [{ pageNumber: 1, text: loadFixture(name) }],
    createdAt: CREATED_AT,
  });
}

function numericEq(
  result:
    | { kind: string; value?: number | string; comparator?: string; rawValue?: string }
    | null
    | undefined,
): { kind: "numeric"; value: number; comparator: string } | null {
  if (!result || result.kind !== "numeric") return null;
  if (typeof result.value !== "number" || !Number.isFinite(result.value)) return null;
  return {
    kind: "numeric",
    value: result.value,
    comparator: typeof result.comparator === "string" ? result.comparator : "eq",
  };
}

describe("June 2020 Total Cholesterol / Chol-HDL ratio identity", () => {
  it("maps CHOLESTEROL, TOTAL to total_cholesterol (not patient identity)", () => {
    expect(matchLabAnalyteAlias("CHOLESTEROL, TOTAL").canonicalMetricId).toBe("total_cholesterol");
  });

  it("does not map bare CHOLESTEROL to total_cholesterol", () => {
    expect(matchLabAnalyteAlias("CHOLESTEROL").canonicalMetricId).not.toBe("total_cholesterol");
    expect(matchLabAnalyteAlias("Cholesterol").canonicalMetricId).not.toBe("total_cholesterol");
  });

  it("extracts genuine Total Cholesterol and Chol/HDL Ratio separately from ALL-CAPS stacked lipids", () => {
    const draft = draftFor("quest_2020_basic_health_allcaps_lipids_v1");
    const byId = new Map(
      draft.results
        .filter((r) => r.aliasMatch.canonicalMetricId)
        .map((r) => [r.aliasMatch.canonicalMetricId!, r]),
    );

    const tc = byId.get("total_cholesterol");
    const ratio = byId.get("chol_hdl_ratio");

    expect(tc).toBeDefined();
    expect(ratio).toBeDefined();

    const tcNum = numericEq(tc!.result);
    const ratioNum = numericEq(ratio!.result);

    expect(tcNum?.value).toBe(173);
    expect(tcNum?.comparator).toBe("eq");
    expect(ratioNum?.value).toBe(3.5);
    expect(ratioNum?.comparator).toBe("eq");

    // Ratio must never publish as Total Cholesterol.
    expect(tcNum?.value).not.toBe(3.5);
    expect(tc!.rawAnalyteLabel?.toUpperCase()).toMatch(/CHOLESTEROL,\s*TOTAL|CHOLESTEROL TOTAL/);
    expect(ratio!.rawAnalyteLabel?.toUpperCase()).toMatch(/CHOL\/HDL/);
  });

  it("does not auto-map a bare CHOLESTEROL + ratio Desired Range fragment to total_cholesterol", () => {
    const text = [
      "Quest Diagnostics",
      "Report Status: FINAL",
      "Collected Date: 06/05/2020",
      "LIPID PANEL",
      "CHOLESTEROL",
      "Desired Range: <5.0 calc",
      "3.5",
    ].join("\n");

    const draft = extractQuestLabReportDraft({
      documentId: "doc_bare_chol",
      userId: "uid_hist",
      draftId: "draft_bare_chol",
      checksumSha256: "a".repeat(64),
      pages: [{ pageNumber: 1, text }],
      createdAt: CREATED_AT,
    });

    const tcRows = draft.results.filter(
      (r) => r.aliasMatch.canonicalMetricId === "total_cholesterol",
    );
    expect(tcRows.every((r) => numericEq(r.result)?.value !== 3.5)).toBe(true);
  });

  it("graph series excludes ratio contamination from total_cholesterol history", () => {
    const draft = draftFor("quest_2020_basic_health_allcaps_lipids_v1");
    const tc = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "total_cholesterol");
    const ratio = draft.results.find((r) => r.aliasMatch.canonicalMetricId === "chol_hdl_ratio");
    expect(tc).toBeDefined();
    expect(ratio).toBeDefined();

    const history: LabHistoryPointDto[] = [
      {
        id: "tc-2024",
        acceptedResultId: "tc-2024",
        canonicalMetricId: "total_cholesterol",
        collectedAt: "2024-10-15T00:00:00.000Z",
        sourceCalendarDate: "2024-10-15",
        result: { kind: "numeric", value: 179, comparator: "eq" },
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: "<200",
        normalizedFlag: null,
        sourceDocumentId: "doc-2024",
        sourcePage: 1,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
      },
      {
        id: "tc-2020",
        acceptedResultId: "tc-2020",
        canonicalMetricId: "total_cholesterol",
        collectedAt: "2020-06-05T00:00:00.000Z",
        sourceCalendarDate: "2020-06-05",
        result: {
          kind: "numeric",
          value: numericEq(tc!.result)!.value,
          comparator: "eq",
        },
        rawUnit: "mg/dL",
        normalizedUnit: "mg/dL",
        rawReferenceRange: "<200",
        normalizedFlag: null,
        sourceDocumentId: "doc-2020",
        sourcePage: 1,
        methodCompatibility: "compatible",
        trendEligible: true,
        trendEligibility: "numeric_compatible",
      },
    ];

    const series = buildLabTrendSeries({
      metricKey: "total_cholesterol",
      displayName: "Total Cholesterol",
      historyPoints: history,
    });

    expect(series.points.map((p) => p.value)).toEqual([173, 179]);
    expect(series.points.every((p) => p.value !== 3.5)).toBe(true);
    expect(series.latest?.value).toBe(179);
    expect(series.prior?.value).toBe(173);
  });
});
