/**
 * Deterministic verification fix tests (structural — no clinical values as truth).
 */
import { describe, expect, it } from "@jest/globals";
import type { LabResultCandidate } from "@oli/contracts";
import { applyDeterministicLabVerificationFix } from "../applyDeterministicLabVerificationFix";

const checksum = "d".repeat(64);

function base(partial: Partial<LabResultCandidate> & Pick<LabResultCandidate, "id">): LabResultCandidate {
  return {
    id: partial.id,
    rawAnalyteLabel: partial.rawAnalyteLabel ?? "X",
    rawResult: partial.rawResult ?? "1",
    result: partial.result ?? { kind: "numeric", value: 1, comparator: "eq" },
    unit: partial.unit ?? {
      rawUnit: null,
      normalizedUnit: null,
      unitRegistryVersion: "1.1.0",
      confidence: 0.4,
      known: false,
    },
    rawReferenceRange: partial.rawReferenceRange ?? null,
    structuredReferenceRange: null,
    flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
    panelId: null,
    aliasMatch: partial.aliasMatch ?? {
      canonicalMetricId: "hba1c",
      matchMethod: "exact_alias",
      aliasVersion: "1.1.0",
      confidence: 0.95,
      requiresReview: false,
    },
    provenance: {
      sourceDocumentId: "doc1",
      sourcePage: 1,
      sourceLocator: "p1",
      sourceChecksumSha256: checksum,
      parserId: "quest_text_pdf_v1",
      parserVersion: "1.1.0",
      extractionVersion: "1.1.0",
    },
    confidence: 0.7,
    warnings: partial.warnings ?? ["ambiguous_unit", "low_confidence"],
    reviewStatus: "pending_review",
  };
}

describe("applyDeterministicLabVerificationFix", () => {
  it("realigns HbA1c Hgb unit to percent when range context indicates percent", () => {
    const fix = applyDeterministicLabVerificationFix(
      base({
        id: "a1c",
        unit: {
          rawUnit: "Hgb",
          normalizedUnit: null,
          unitRegistryVersion: "1.1.0",
          confidence: 0.4,
          known: false,
        },
        rawReferenceRange: "<5.7 % of total",
      }),
    );
    expect(fix?.methods).toContain("quest_hba1c_unit_realign_v1");
    expect(fix?.candidate.unit.normalizedUnit).toBe("%");
    expect(fix?.candidate.unit.known).toBe(true);
  });

  it("assigns lipid default unit when LDL unit is missing", () => {
    const fix = applyDeterministicLabVerificationFix(
      base({
        id: "ldl",
        aliasMatch: {
          canonicalMetricId: "ldl_c",
          matchMethod: "exact_alias",
          aliasVersion: "1.1.0",
          confidence: 0.95,
          requiresReview: false,
        },
        unit: {
          rawUnit: null,
          normalizedUnit: null,
          unitRegistryVersion: "1.1.0",
          confidence: 1,
          known: true,
        },
        warnings: [],
      }),
    );
    expect(fix?.methods).toContain("quest_lipid_default_unit_v1");
    expect(fix?.candidate.unit.normalizedUnit).toBe("mg/dL");
  });
});
