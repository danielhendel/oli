/**
 * Candidate resolution accounting + repeated-label / non-result tests.
 */
import { describe, expect, it } from "@jest/globals";
import type { LabExtractionDraft, LabResultCandidate, LabUnmatchedCandidate } from "@oli/contracts";
import { LABS_OS_SCHEMA_VERSION } from "@oli/contracts";
import { assertLabCandidateAccountingComplete } from "@oli/contracts";
import { classifyNonResultLabLabel } from "../classifyNonResultLabLabel";
import { refineLabMetricIdWithContext } from "../refineLabMetricIdWithContext";
import { resolveLabExtractionCandidates } from "../resolveLabExtractionCandidates";
import { matchLabAnalyteAlias } from "../../extraction/matchLabAnalyteAlias";

const checksum = "b".repeat(64);

function provenance(page: number, locator: string) {
  return {
    sourceDocumentId: "doc1",
    sourcePage: page,
    sourceLocator: locator,
    sourceChecksumSha256: checksum,
    parserId: "quest_text_pdf_v1",
    parserVersion: "1.1.0",
    extractionVersion: "1.1.0",
  };
}

function result(partial: Partial<LabResultCandidate> & Pick<LabResultCandidate, "id">): LabResultCandidate {
  const { id, ...rest } = partial;
  return {
    id,
    rawAnalyteLabel: rest.rawAnalyteLabel ?? "LDL-C",
    rawResult: rest.rawResult ?? "100",
    result: rest.result ?? { kind: "numeric", value: 100, comparator: "eq" },
    unit: rest.unit ?? {
      rawUnit: "mg/dL",
      normalizedUnit: "mg/dL",
      unitRegistryVersion: "1.1.0",
      confidence: 1,
      known: true,
    },
    rawReferenceRange: null,
    structuredReferenceRange: null,
    flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
    panelId: null,
    aliasMatch: rest.aliasMatch ?? {
      canonicalMetricId: "ldl_c",
      matchMethod: "exact_alias",
      aliasVersion: "1.2.0",
      confidence: 0.95,
      requiresReview: false,
    },
    provenance: rest.provenance ?? provenance(1, "p1"),
    confidence: 0.95,
    warnings: [],
    reviewStatus: "pending_review",
    ...rest,
  };
}

function unmatched(
  partial: Partial<LabUnmatchedCandidate> & Pick<LabUnmatchedCandidate, "id" | "rawAnalyteLabel">,
): LabUnmatchedCandidate {
  const { id, rawAnalyteLabel, ...rest } = partial;
  return {
    id,
    rawAnalyteLabel,
    rawResult: rest.rawResult ?? "1",
    reason: rest.reason ?? "unmatched_alias",
    provenance: rest.provenance ?? provenance(1, "u1"),
    confidence: 0.5,
    reviewStatus: "pending_review",
    rawUnit: rest.rawUnit ?? "mg/dL",
    ...rest,
  };
}

function draft(results: LabResultCandidate[], unmatchedRows: LabUnmatchedCandidate[]): LabExtractionDraft {
  return {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: "d1",
    documentId: "doc1",
    userId: "u1",
    reportCandidate: { confidence: 0.99, collectedAt: "2024-01-01T00:00:00.000Z", reportFamily: "quest" },
    panels: [],
    results,
    unmatched: unmatchedRows,
    warnings: [],
    parser: { id: "quest_text_pdf_v1", version: "1.1.0", extractionVersion: "1.1.0" },
    sourceChecksumSha256: checksum,
    status: "review_needed",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

describe("classifyNonResultLabLabel", () => {
  it("classifies desirable range as risk category", () => {
    expect(classifyNonResultLabLabel("Desirable Range")?.kind).toBe("risk_category");
  });

  it("classifies standalone serum as malformed alignment", () => {
    expect(classifyNonResultLabLabel("Serum")).toEqual({
      kind: "malformed",
      reason: "row_alignment_failed",
    });
  });

  it("does not classify genuine analytes as non-results", () => {
    expect(classifyNonResultLabLabel("LDL-CHOLESTEROL")).toBeNull();
    expect(classifyNonResultLabLabel("TESTOSTERONE, BIOAVAILABLE")).toBeNull();
  });
});

describe("refineLabMetricIdWithContext", () => {
  it("maps globulin + nmol/L to SHBG and g/dL to serum globulin", () => {
    expect(
      refineLabMetricIdWithContext({
        metricId: "serum_globulin",
        rawLabel: "GLOBULIN",
        normalizedUnit: "nmol/L",
        rawUnit: "nmol/L",
      }),
    ).toBe("shbg");
    expect(
      refineLabMetricIdWithContext({
        metricId: "serum_globulin",
        rawLabel: "GLOBULIN",
        normalizedUnit: "g/dL",
        rawUnit: "g/dL",
      }),
    ).toBe("serum_globulin");
  });
});

describe("catalog aliases for Report A gaps", () => {
  it("resolves bioavailable testosterone and CBC indices", () => {
    expect(matchLabAnalyteAlias("TESTOSTERONE, BIOAVAILABLE").canonicalMetricId).toBe(
      "bioavailable_testosterone",
    );
    expect(matchLabAnalyteAlias("MCV").canonicalMetricId).toBe("mcv");
    expect(matchLabAnalyteAlias("ABSOLUTE NEUTROPHILS").canonicalMetricId).toBe("absolute_neutrophils");
    expect(matchLabAnalyteAlias("NON HDL CHOLESTEROL").canonicalMetricId).toBe("non_hdl_c");
    expect(matchLabAnalyteAlias("CHOL/HDLC RATIO").canonicalMetricId).toBe("chol_hdl_ratio");
  });
});

describe("resolveLabExtractionCandidates", () => {
  it("deduplicates same metric across pages and keeps accounting complete", () => {
    const out = resolveLabExtractionCandidates(
      draft(
        [
          result({ id: "a", provenance: provenance(6, "p6"), aliasMatch: {
            canonicalMetricId: "ldl_c", matchMethod: "exact_alias", aliasVersion: "1.2.0", confidence: 0.95, requiresReview: false,
          }}),
          result({ id: "b", provenance: provenance(9, "p9"), aliasMatch: {
            canonicalMetricId: "ldl_c", matchMethod: "exact_alias", aliasVersion: "1.2.0", confidence: 0.95, requiresReview: false,
          }}),
        ],
        [unmatched({ id: "c", rawAnalyteLabel: "Desirable Range", rawResult: "<100" })],
      ),
    );
    expect(out.currentResults).toHaveLength(1);
    expect(out.accounting.duplicateRows).toBe(1);
    expect(out.accounting.riskCategoryRows).toBe(1);
    expect(out.accounting.unclassified).toBe(0);
    expect(assertLabCandidateAccountingComplete(out.accounting)).toBe(true);
    expect(out.resolutions).toHaveLength(3);
  });

  it("promotes unmatched bioavailable testosterone to a current result", () => {
    const out = resolveLabExtractionCandidates(
      draft(
        [],
        [
          unmatched({
            id: "t",
            rawAnalyteLabel: "TESTOSTERONE, BIOAVAILABLE",
            rawResult: "120",
            rawUnit: "ng/dL",
          }),
        ],
      ),
    );
    expect(out.currentResults).toHaveLength(1);
    expect(out.currentResults[0]!.aliasMatch.canonicalMetricId).toBe("bioavailable_testosterone");
    expect(out.accounting.unsupportedTrueAnalytes).toBe(0);
  });

  it("keeps CMP globulin and SHBG distinct when units differ", () => {
    const out = resolveLabExtractionCandidates(
      draft(
        [],
        [
          unmatched({
            id: "g1",
            rawAnalyteLabel: "GLOBULIN",
            rawResult: "2.5",
            rawUnit: "g/dL",
            provenance: provenance(1, "g1"),
          }),
          unmatched({
            id: "g2",
            rawAnalyteLabel: "GLOBULIN",
            rawResult: "30",
            rawUnit: "nmol/L",
            provenance: provenance(1, "g2"),
          }),
        ],
      ),
    );
    const ids = out.currentResults.map((r) => r.aliasMatch.canonicalMetricId).sort();
    expect(ids).toEqual(["serum_globulin", "shbg"]);
  });
});
