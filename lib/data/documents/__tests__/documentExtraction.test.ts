import { describe, expect, it } from "@jest/globals";
import { DOCUMENT_SCHEMA_VERSION } from "@/lib/contracts";
import {
  isExtractionAcceptedAsCanonical,
  validateExtractionEnvelope,
} from "../documentExtraction";

const VALID_CHECKSUM = "d".repeat(64);
const ISO = "2026-07-28T15:00:00.000Z";

function field(overrides: Record<string, unknown> = {}) {
  return {
    fieldId: "f1",
    rawLabel: "Glucose",
    rawValue: "90",
    pageNumber: 1,
    confidence: 0.8,
    warningCodes: [],
    parserFieldType: "analyte",
    requiresReview: true,
    ...overrides,
  };
}

function provenance(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "doc_1",
    fieldId: "f1",
    parserId: "noop",
    parserVersion: "1.0.0",
    extractionVersion: "1.0.0",
    pageNumber: 1,
    confidence: 0.8,
    warningCodes: [],
    computedAt: ISO,
    ...overrides,
  };
}

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    documentId: "doc_1",
    parserId: "noop",
    parserVersion: "1.0.0",
    extractionVersion: "1.0.0",
    status: "partial",
    pagesProcessed: 1,
    fields: [field()],
    warnings: [],
    confidenceSummary: { overall: 0.8, lowConfidenceFieldCount: 0 },
    provenance: [provenance()],
    sourceDocumentChecksum: VALID_CHECKSUM,
    reviewStatus: "review_needed",
    createdAt: ISO,
    ...overrides,
  };
}

describe("validateExtractionEnvelope", () => {
  it("accepts a well-formed envelope with matching provenance", () => {
    const result = validateExtractionEnvelope(envelope());
    expect(result.ok).toBe(true);
  });

  it("requires provenance when structured fields are present", () => {
    const result = validateExtractionEnvelope(envelope({ provenance: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["MISSING_PROVENANCE", "PROVENANCE_FIELD_MISMATCH"]),
    );
  });

  it("rejects duplicate field IDs", () => {
    const result = validateExtractionEnvelope(
      envelope({
        fields: [field({ fieldId: "dup" }), field({ fieldId: "dup", rawLabel: "Other" })],
        provenance: [provenance({ fieldId: "dup" }), provenance({ fieldId: "dup" })],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === "DUPLICATE_FIELD_ID")).toBe(true);
  });

  it("rejects invalid confidence values", () => {
    const outOfRange = validateExtractionEnvelope(
      envelope({
        fields: [field({ confidence: 1.5 })],
      }),
    );
    expect(outOfRange.ok).toBe(false);

    const negative = validateExtractionEnvelope(
      envelope({
        confidenceSummary: { overall: -0.1, lowConfidenceFieldCount: 0 },
      }),
    );
    expect(negative.ok).toBe(false);
  });

  it("rejects NaN and Infinity numeric values", () => {
    const nanConfidence = validateExtractionEnvelope(
      envelope({
        fields: [field({ confidence: Number.NaN })],
      }),
    );
    expect(nanConfidence.ok).toBe(false);

    const infinityValue = validateExtractionEnvelope(
      envelope({
        fields: [field({ normalizedCandidateValue: Number.POSITIVE_INFINITY })],
      }),
    );
    expect(infinityValue.ok).toBe(false);

    const nanValue = validateExtractionEnvelope(
      envelope({
        fields: [field({ normalizedCandidateValue: Number.NaN })],
      }),
    );
    expect(nanValue.ok).toBe(false);
  });
});

describe("isExtractionAcceptedAsCanonical", () => {
  it("is always false even for complete accepted-looking envelopes", () => {
    const result = validateExtractionEnvelope(
      envelope({
        status: "complete",
        reviewStatus: "accepted",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isExtractionAcceptedAsCanonical(result.value)).toBe(false);
  });
});
