import { describe, expect, it } from "@jest/globals";
import {
  LABS_OS_SCHEMA_VERSION,
  acceptedLabResultSchema,
  labExtractionDraftSchema,
  labReferenceIntervalCandidateSchema,
  labResultValueSchema,
  labReviewRecordSchema,
} from "../labsOs";

const ISO = "2026-07-28T15:00:00.000Z";
const CHECKSUM = "a".repeat(64);

describe("labResultValueSchema", () => {
  it("round-trips numeric with eq comparator", () => {
    const value = { kind: "numeric", value: 98, comparator: "eq" };
    const parsed = labResultValueSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual(value);
  });

  it("round-trips numeric with lt comparator (inequality preserved, not flattened)", () => {
    const value = { kind: "numeric", value: 4, comparator: "lt" };
    const parsed = labResultValueSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.kind).toBe("numeric");
    if (parsed.data.kind === "numeric") {
      expect(parsed.data.comparator).toBe("lt");
    }
  });

  it("round-trips qualitative values with rawValue preserved", () => {
    const value = { kind: "qualitative", value: "non_reactive", rawValue: "Non-Reactive" };
    const parsed = labResultValueSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual(value);
  });

  it("round-trips pattern values", () => {
    const value = { kind: "pattern", value: "Pattern B" };
    const parsed = labResultValueSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual(value);
  });

  it("round-trips not_reported values with a reason", () => {
    const value = { kind: "not_reported", reason: "not_applicable" };
    const parsed = labResultValueSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual(value);
  });

  it("rejects an unknown kind discriminator", () => {
    expect(labResultValueSchema.safeParse({ kind: "bogus", value: 1 }).success).toBe(false);
  });

  it("rejects numeric values missing a comparator", () => {
    expect(labResultValueSchema.safeParse({ kind: "numeric", value: 5 }).success).toBe(false);
  });

  it("rejects non-finite numeric values", () => {
    expect(
      labResultValueSchema.safeParse({ kind: "numeric", value: Number.NaN, comparator: "eq" }).success,
    ).toBe(false);
    expect(
      labResultValueSchema.safeParse({ kind: "numeric", value: Number.POSITIVE_INFINITY, comparator: "eq" })
        .success,
    ).toBe(false);
  });
});

describe("labReferenceIntervalCandidateSchema", () => {
  it("accepts a closed numeric range", () => {
    const value = {
      kind: "numeric_range",
      lower: { value: 65, inclusive: true },
      upper: { value: 99, inclusive: true },
      unit: "mg/dL",
    };
    expect(labReferenceIntervalCandidateSchema.safeParse(value).success).toBe(true);
  });

  it("accepts a qualitative_expected range", () => {
    expect(
      labReferenceIntervalCandidateSchema.safeParse({
        kind: "qualitative_expected",
        expectedValues: ["Negative"],
      }).success,
    ).toBe(true);
  });

  it("accepts report_risk_categories with at least one category", () => {
    expect(
      labReferenceIntervalCandidateSchema.safeParse({
        kind: "report_risk_categories",
        categories: [{ label: "Optimal", condition: "<100" }],
      }).success,
    ).toBe(true);
    expect(
      labReferenceIntervalCandidateSchema.safeParse({
        kind: "report_risk_categories",
        categories: [],
      }).success,
    ).toBe(false);
  });

  it("accepts raw_only as an ambiguous-range fallback", () => {
    expect(
      labReferenceIntervalCandidateSchema.safeParse({ kind: "raw_only", raw: "See notes" }).success,
    ).toBe(true);
  });

  it("rejects unknown discriminator kinds", () => {
    expect(labReferenceIntervalCandidateSchema.safeParse({ kind: "bogus" }).success).toBe(false);
  });
});

function validCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "cand_1",
    rawAnalyteLabel: "LDL-CHOLESTEROL",
    rawResult: "98",
    result: { kind: "numeric", value: 98, comparator: "eq" },
    unit: {
      rawUnit: "mg/dL",
      normalizedUnit: "mg/dL",
      unitRegistryVersion: "1.0.0",
      confidence: 0.99,
      known: true,
    },
    rawReferenceRange: "<100",
    structuredReferenceRange: { kind: "numeric_range", upper: { value: 100, inclusive: true } },
    flag: { rawFlag: null, normalized: "none", source: "report_flag", confidence: 1 },
    panelId: "panel_1",
    aliasMatch: {
      canonicalMetricId: "ldl_c",
      matchMethod: "exact_alias",
      aliasVersion: "1.0.0",
      confidence: 0.95,
      requiresReview: false,
    },
    method: null,
    laboratory: null,
    provenance: {
      sourceDocumentId: "doc_1",
      sourcePage: 1,
      sourceLocator: "p1:L1:LDL",
      sourceChecksumSha256: CHECKSUM,
      parserId: "quest_text_pdf_v1",
      parserVersion: "1.0.0",
      extractionVersion: "1.0.0",
      panelName: "LIPID PANEL",
      resultRole: "current",
    },
    confidence: 0.95,
    warnings: [],
    reviewStatus: "pending",
    ...overrides,
  };
}

function validDraft(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: "draft_1",
    documentId: "doc_1",
    userId: "uid_1",
    reportCandidate: { confidence: 0.9, pageCount: 1 },
    panels: [{ id: "panel_1", name: "LIPID PANEL", sourcePage: 1 }],
    results: [validCandidate()],
    unmatched: [],
    warnings: [],
    parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
    sourceChecksumSha256: CHECKSUM,
    status: "review_needed",
    createdAt: ISO,
    ...overrides,
  };
}

describe("labExtractionDraftSchema", () => {
  it("accepts a valid draft with matched results", () => {
    const parsed = labExtractionDraftSchema.safeParse(validDraft());
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid unsupported draft with no results", () => {
    const parsed = labExtractionDraftSchema.safeParse(
      validDraft({
        results: [],
        panels: [],
        status: "unsupported",
        warnings: [{ code: "scanned_pdf_no_text", message: "No text layer" }],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid checksum format", () => {
    expect(labExtractionDraftSchema.safeParse(validDraft({ sourceChecksumSha256: "xyz" })).success).toBe(
      false,
    );
  });

  it("rejects an invalid draft status", () => {
    expect(labExtractionDraftSchema.safeParse(validDraft({ status: "bogus" })).success).toBe(false);
  });

  it("does not require patient identifiers on candidates or metadata", () => {
    const shape = validDraft().results[0] as Record<string, unknown>;
    expect(shape).not.toHaveProperty("patientId");
    expect(shape).not.toHaveProperty("dateOfBirth");
  });
});

describe("labReviewRecordSchema", () => {
  it("accepts a valid review record", () => {
    const parsed = labReviewRecordSchema.safeParse({
      schemaVersion: LABS_OS_SCHEMA_VERSION,
      id: "review_1",
      documentId: "doc_1",
      userId: "uid_1",
      draftId: "draft_1",
      status: "in_progress",
      reviewVersion: 0,
      candidateStatuses: { cand_1: "pending" },
      corrections: [],
      createdAt: ISO,
      updatedAt: ISO,
    });
    expect(parsed.success).toBe(true);
  });

  it("preserves accept/reject idempotency keys for server replay", () => {
    const parsed = labReviewRecordSchema.safeParse({
      schemaVersion: LABS_OS_SCHEMA_VERSION,
      id: "review_1",
      documentId: "doc_1",
      userId: "uid_1",
      draftId: "draft_1",
      status: "accepted",
      reviewVersion: 2,
      candidateStatuses: { cand_1: "accepted" },
      corrections: [],
      createdAt: ISO,
      updatedAt: ISO,
      acceptedAt: ISO,
      lastAcceptIdempotencyKey: "accept-key-1",
      lastRejectIdempotencyKey: "reject-key-1",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.lastAcceptIdempotencyKey).toBe("accept-key-1");
    expect(parsed.data.lastRejectIdempotencyKey).toBe("reject-key-1");
  });

  it("rejects a negative reviewVersion", () => {
    expect(
      labReviewRecordSchema.safeParse({
        schemaVersion: LABS_OS_SCHEMA_VERSION,
        id: "review_1",
        documentId: "doc_1",
        userId: "uid_1",
        draftId: "draft_1",
        status: "in_progress",
        reviewVersion: -1,
        candidateStatuses: {},
        corrections: [],
        createdAt: ISO,
        updatedAt: ISO,
      }).success,
    ).toBe(false);
  });
});

describe("acceptedLabResultSchema", () => {
  it("round-trips a valid accepted numeric result", () => {
    const value = {
      schemaVersion: LABS_OS_SCHEMA_VERSION,
      id: "accepted_1",
      userId: "uid_1",
      sourceDocumentId: "doc_1",
      sourceExtractionId: "extraction_1",
      sourceCandidateId: "cand_1",
      canonicalMetricId: "ldl_c",
      rawAnalyteLabel: "LDL-CHOLESTEROL",
      panelId: "panel_1",
      collectedAt: ISO,
      reportedAt: ISO,
      fasting: true,
      result: { kind: "numeric", value: 98, comparator: "eq" },
      rawUnit: "mg/dL",
      normalizedUnit: "mg/dL",
      rawReferenceRange: "<100",
      structuredReferenceRange: { kind: "numeric_range", upper: { value: 100, inclusive: true } },
      rawFlag: null,
      normalizedFlag: "none",
      laboratory: { code: null, name: "Quest Diagnostics" },
      method: null,
      provenance: {
        sourceDocumentId: "doc_1",
        sourcePage: 1,
        sourceLocator: "p1:L1:LDL",
        sourceChecksumSha256: CHECKSUM,
        parserId: "quest_text_pdf_v1",
        parserVersion: "1.0.0",
        extractionVersion: "1.0.0",
      },
      review: { status: "accepted", acceptedAt: ISO, reviewVersion: "1" },
      parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
      createdAt: ISO,
    };
    const parsed = acceptedLabResultSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.result).toEqual(value.result);
  });

  it("accepts a qualitative accepted result without inventing numeric values", () => {
    const parsed = acceptedLabResultSchema.safeParse({
      schemaVersion: LABS_OS_SCHEMA_VERSION,
      id: "accepted_2",
      userId: "uid_1",
      sourceDocumentId: "doc_1",
      sourceExtractionId: "extraction_1",
      sourceCandidateId: "cand_2",
      canonicalMetricId: null,
      rawAnalyteLabel: "HEPATITIS C AB",
      panelId: null,
      collectedAt: null,
      reportedAt: null,
      fasting: null,
      result: { kind: "qualitative", value: "non_reactive", rawValue: "Non-Reactive" },
      rawUnit: null,
      normalizedUnit: null,
      rawReferenceRange: null,
      structuredReferenceRange: null,
      rawFlag: null,
      normalizedFlag: null,
      laboratory: null,
      method: null,
      provenance: {
        sourceDocumentId: "doc_1",
        sourcePage: 2,
        sourceLocator: "p2:L1:HEP",
        sourceChecksumSha256: CHECKSUM,
        parserId: "quest_text_pdf_v1",
        parserVersion: "1.0.0",
        extractionVersion: "1.0.0",
      },
      review: { status: "accepted", acceptedAt: ISO, reviewVersion: "1" },
      parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
      createdAt: ISO,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid sourceChecksumSha256 inside provenance", () => {
    const base = {
      schemaVersion: LABS_OS_SCHEMA_VERSION,
      id: "accepted_3",
      userId: "uid_1",
      sourceDocumentId: "doc_1",
      sourceExtractionId: "extraction_1",
      sourceCandidateId: "cand_1",
      canonicalMetricId: "ldl_c",
      rawAnalyteLabel: "LDL-CHOLESTEROL",
      panelId: null,
      collectedAt: null,
      reportedAt: null,
      fasting: null,
      result: { kind: "numeric", value: 98, comparator: "eq" },
      rawUnit: null,
      normalizedUnit: null,
      rawReferenceRange: null,
      structuredReferenceRange: null,
      rawFlag: null,
      normalizedFlag: null,
      laboratory: null,
      method: null,
      provenance: {
        sourceDocumentId: "doc_1",
        sourcePage: 1,
        sourceLocator: "p1:L1:LDL",
        sourceChecksumSha256: "not-a-checksum",
        parserId: "quest_text_pdf_v1",
        parserVersion: "1.0.0",
        extractionVersion: "1.0.0",
      },
      review: { status: "accepted", acceptedAt: ISO, reviewVersion: "1" },
      parser: { id: "quest_text_pdf_v1", version: "1.0.0", extractionVersion: "1.0.0" },
      createdAt: ISO,
    };
    expect(acceptedLabResultSchema.safeParse(base).success).toBe(false);
  });
});
