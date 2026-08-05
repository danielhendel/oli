/**
 * Field-level trust — optional range/flag must not block clear results.
 */
import { describe, expect, it } from "@jest/globals";
import type { LabReportMetadataCandidate, LabResultCandidate } from "@oli/contracts";
import { deriveLabFieldTrust, requiredFieldsTrustedForImport } from "../deriveLabFieldTrust";

const checksum = "a".repeat(64);

function report(partial: Partial<LabReportMetadataCandidate> = {}): LabReportMetadataCandidate {
  return {
    reportFamily: "quest_directlabs",
    laboratoryName: "Quest",
    collectedAt: "2024-01-15",
    reportedAt: null,
    patientName: null,
    orderingPhysician: null,
    accessionNumber: null,
    specimenType: null,
    confidence: 0.99,
    ...partial,
  } as LabReportMetadataCandidate;
}

function candidate(partial: Partial<LabResultCandidate> = {}): LabResultCandidate {
  return {
    id: "c1",
    rawAnalyteLabel: "Total Cholesterol",
    rawResult: "180",
    result: { kind: "numeric", value: 180, comparator: "eq" },
    unit: {
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
    aliasMatch: {
      canonicalMetricId: "total_cholesterol",
      matchMethod: "exact_alias",
      aliasVersion: "1.1.0",
      confidence: 0.99,
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
    confidence: 0.98,
    warnings: [],
    reviewStatus: "pending_review",
    ...partial,
  };
}

describe("deriveLabFieldTrust", () => {
  it("imports when result is clear and range is unresolved", () => {
    const trust = deriveLabFieldTrust({
      report: report(),
      candidate: candidate({
        rawReferenceRange: "see risk categories",
        structuredReferenceRange: null,
      }),
    });
    expect(trust.referenceRange).toBe("unresolved");
    expect(requiredFieldsTrustedForImport(trust)).toBe(true);
  });

  it("imports when source flag is absent", () => {
    const trust = deriveLabFieldTrust({
      report: report(),
      candidate: candidate(),
    });
    expect(trust.sourceFlag).toBe("not_present");
    expect(requiredFieldsTrustedForImport(trust)).toBe(true);
  });

  it("withholds when collection date is missing", () => {
    const trust = deriveLabFieldTrust({
      report: report({ collectedAt: null }),
      candidate: candidate(),
    });
    expect(trust.collectionDate).toBe("unresolved");
    expect(requiredFieldsTrustedForImport(trust)).toBe(false);
  });

  it("withholds when provenance is missing", () => {
    const trust = deriveLabFieldTrust({
      report: report(),
      candidate: candidate({
        provenance: {
          sourceDocumentId: "",
          sourcePage: 0,
          sourceLocator: "",
          sourceChecksumSha256: "",
          parserId: "",
          parserVersion: "1.1.0",
          extractionVersion: "1.1.0",
        },
      }),
    });
    expect(trust.provenance).toBe("unresolved");
    expect(requiredFieldsTrustedForImport(trust)).toBe(false);
  });
});
