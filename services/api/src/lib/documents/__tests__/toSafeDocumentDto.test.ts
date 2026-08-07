import { describe, expect, it } from "@jest/globals";
import { DOCUMENT_SCHEMA_VERSION, type UserDocumentRecord } from "@oli/contracts";
import { toDocumentDetailDto, toDocumentListItemDto } from "../toSafeDocumentDto";

const ISO = "2026-07-28T15:00:00.000Z";

function labsDocumentRecord(
  overrides: Partial<UserDocumentRecord> = {},
): UserDocumentRecord {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    id: "doc_opaque",
    userId: "uid_test",
    domain: "labs",
    documentType: "lab_report",
    originalFilename: "MRWGxLdl2Krp8DFtpjYy_d0y6W85Tkh2isXe.pdf",
    safeDisplayFilename: "MRWGxLdl2Krp8DFtpjYy_d0y6W85Tkh2isXe.pdf",
    mediaType: "application/pdf",
    byteSize: 1024,
    checksumSha256: "a".repeat(64),
    storageObjectId: "objects/doc_opaque",
    uploadedAt: ISO,
    source: "user_upload",
    status: "structured",
    retentionStatus: "active",
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe("toSafeDocumentDto consumer-safe filenames", () => {
  it("maps opaque persisted safeDisplayFilename to Lab report in list DTO", () => {
    const dto = toDocumentListItemDto(labsDocumentRecord());
    expect(dto.filename).toBe("Lab report");
  });

  it("maps opaque persisted safeDisplayFilename to Lab report in detail DTO", () => {
    const dto = toDocumentDetailDto({
      record: labsDocumentRecord(),
      processingState: null,
      safeWarnings: [],
    });
    expect(dto.filename).toBe("Lab report");
  });

  it("preserves readable filenames in list DTO", () => {
    const dto = toDocumentListItemDto(
      labsDocumentRecord({
        originalFilename: "Quest_Labs_2022.pdf",
        safeDisplayFilename: "Quest_Labs_2022.pdf",
      }),
    );
    expect(dto.filename).toBe("Quest_Labs_2022.pdf");
  });
});
