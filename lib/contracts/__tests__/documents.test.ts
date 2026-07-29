import { describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_SCHEMA_VERSION,
  documentClassificationResultSchema,
  documentDetailDtoSchema,
  documentExtractionResultSchema,
  documentListItemDtoSchema,
  documentsListResponseDtoSchema,
  userDocumentRecordSchema,
} from "../documents";

const VALID_CHECKSUM = "a".repeat(64);
const ISO = "2026-07-28T15:00:00.000Z";

function validUserDocumentRecord(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    id: "doc_1",
    userId: "uid_abc",
    domain: "labs",
    documentType: "lab_report",
    originalFilename: "Report.pdf",
    safeDisplayFilename: "Report.pdf",
    mediaType: "application/pdf",
    byteSize: 1024,
    checksumSha256: VALID_CHECKSUM,
    storageObjectId: "objects/doc_1",
    uploadedAt: ISO,
    source: "user_upload",
    status: "stored",
    retentionStatus: "active",
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function validExtractionEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    documentId: "doc_1",
    parserId: "noop",
    parserVersion: "1.0.0",
    extractionVersion: "1.0.0",
    status: "unsupported",
    pagesProcessed: 0,
    fields: [],
    warnings: [],
    confidenceSummary: { overall: null, lowConfidenceFieldCount: 0 },
    provenance: [],
    sourceDocumentChecksum: VALID_CHECKSUM,
    reviewStatus: "extracted",
    createdAt: ISO,
    ...overrides,
  };
}

function validListItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc_1",
    filename: "Report.pdf",
    domain: "labs",
    documentType: "lab_report",
    uploadedAt: ISO,
    status: "stored",
    canViewOriginal: false,
    canRetry: false,
    canDelete: true,
    legacySource: "document",
    ...overrides,
  };
}

describe("userDocumentRecordSchema", () => {
  it("accepts a valid internal document record", () => {
    const parsed = userDocumentRecordSchema.safeParse(validUserDocumentRecord());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.retentionStatus).toBe("active");
    expect(parsed.data.checksumSha256).toBe(VALID_CHECKSUM);
  });

  it("rejects invalid checksum format", () => {
    expect(
      userDocumentRecordSchema.safeParse(
        validUserDocumentRecord({ checksumSha256: "not-a-checksum" }),
      ).success,
    ).toBe(false);
    expect(
      userDocumentRecordSchema.safeParse(
        validUserDocumentRecord({ checksumSha256: "A".repeat(64) }),
      ).success,
    ).toBe(false);
  });

  it("rejects invalid status and empty ids", () => {
    expect(
      userDocumentRecordSchema.safeParse(validUserDocumentRecord({ status: "bogus" })).success,
    ).toBe(false);
    expect(userDocumentRecordSchema.safeParse(validUserDocumentRecord({ id: "" })).success).toBe(
      false,
    );
  });
});

describe("documentExtractionResultSchema", () => {
  it("accepts a valid extraction envelope", () => {
    expect(documentExtractionResultSchema.safeParse(validExtractionEnvelope()).success).toBe(true);
  });

  it("rejects NaN confidence on fields and summary", () => {
    expect(
      documentExtractionResultSchema.safeParse(
        validExtractionEnvelope({
          fields: [
            {
              fieldId: "f1",
              rawLabel: "Glucose",
              rawValue: "90",
              pageNumber: 1,
              confidence: Number.NaN,
              warningCodes: [],
              parserFieldType: "analyte",
              requiresReview: true,
            },
          ],
          provenance: [
            {
              documentId: "doc_1",
              fieldId: "f1",
              parserId: "noop",
              parserVersion: "1.0.0",
              extractionVersion: "1.0.0",
              pageNumber: 1,
              confidence: null,
              warningCodes: [],
              computedAt: ISO,
            },
          ],
        }),
      ).success,
    ).toBe(false);

    expect(
      documentExtractionResultSchema.safeParse(
        validExtractionEnvelope({
          confidenceSummary: { overall: Number.NaN, lowConfidenceFieldCount: 0 },
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects invalid sourceDocumentChecksum", () => {
    expect(
      documentExtractionResultSchema.safeParse(
        validExtractionEnvelope({ sourceDocumentChecksum: "xyz" }),
      ).success,
    ).toBe(false);
  });
});

describe("documentClassificationResultSchema", () => {
  it("accepts null confidence and rejects NaN confidence", () => {
    expect(
      documentClassificationResultSchema.safeParse({
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        documentType: "unknown",
        confidence: null,
        reasonCode: "insufficient_signal",
        requiresReview: true,
        classifierVersion: "1.0.0",
      }).success,
    ).toBe(true);

    expect(
      documentClassificationResultSchema.safeParse({
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        documentType: "lab_report",
        confidence: Number.NaN,
        reasonCode: "user_selected_domain_constrained",
        requiresReview: true,
        classifierVersion: "1.0.0",
      }).success,
    ).toBe(false);
  });
});

describe("safe consumer DTOs", () => {
  it("accepts list/detail DTOs without storagePath, uid, or checksum", () => {
    const list = documentListItemDtoSchema.safeParse(validListItem());
    expect(list.success).toBe(true);

    const detail = documentDetailDtoSchema.safeParse({
      ...validListItem(),
      processingState: null,
      extractionAvailability: "unavailable",
      safeWarnings: [],
    });
    expect(detail.success).toBe(true);

    const response = documentsListResponseDtoSchema.safeParse({
      ok: true,
      items: [validListItem()],
      nextCursor: null,
    });
    expect(response.success).toBe(true);
  });

  it("does not require storagePath, uid, or checksumSha256 on consumer schemas", () => {
    const listShape = documentListItemDtoSchema.shape;
    expect(listShape).not.toHaveProperty("storagePath");
    expect(listShape).not.toHaveProperty("uid");
    expect(listShape).not.toHaveProperty("userId");
    expect(listShape).not.toHaveProperty("checksumSha256");
    expect(listShape).not.toHaveProperty("checksum");

    const detailShape = documentDetailDtoSchema.shape;
    expect(detailShape).not.toHaveProperty("storagePath");
    expect(detailShape).not.toHaveProperty("uid");
    expect(detailShape).not.toHaveProperty("userId");
    expect(detailShape).not.toHaveProperty("checksumSha256");
    expect(detailShape).not.toHaveProperty("checksum");
  });

  it("strips unknown storage internals from consumer DTOs rather than requiring them", () => {
    const parsed = documentListItemDtoSchema.safeParse({
      ...validListItem(),
      storagePath: "users/uid/documents/x",
      checksumSha256: VALID_CHECKSUM,
      uid: "uid_secret",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty("storagePath");
    expect(parsed.data).not.toHaveProperty("checksumSha256");
    expect(parsed.data).not.toHaveProperty("uid");
  });
});
