import { describe, expect, it } from "@jest/globals";
import type { LabUploadDto } from "@/lib/contracts";
import {
  mapLegacyLabUploadToDetail,
  mapLegacyLabUploadToListItem,
  parseLegacyLabDocumentId,
} from "../mapLegacyLabUpload";

const FAKE_UID = "uid_lab_legacy_xyz";
const FAKE_STORAGE_PATH = `lab-uploads/${FAKE_UID}/deadbeefhash/DirectLabs.pdf`;

function unsupportedUpload(overrides: Partial<LabUploadDto> = {}): LabUploadDto {
  return {
    id: "upload_doc_secret_99",
    fileName: "DirectLabs.pdf",
    storagePath: FAKE_STORAGE_PATH,
    mimeType: "application/pdf",
    uploadedAt: "2026-07-28T15:00:00.000Z",
    status: "unsupported",
    extractedCount: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    errorMessage: "Structured extraction is not available yet.",
    ...overrides,
  };
}

describe("mapLegacyLabUploadToListItem", () => {
  it("maps unsupported lab uploads into Document OS list DTOs", () => {
    const item = mapLegacyLabUploadToListItem(unsupportedUpload());
    expect(item).toEqual({
      id: "lab:upload_doc_secret_99",
      filename: "DirectLabs.pdf",
      domain: "labs",
      documentType: "lab_report",
      uploadedAt: "2026-07-28T15:00:00.000Z",
      status: "unsupported",
      canViewOriginal: false,
      canRetry: true,
      canDelete: false,
      legacySource: "lab_upload",
    });
  });

  it("sets canDelete false and omits storage path from the DTO", () => {
    const item = mapLegacyLabUploadToListItem(unsupportedUpload());
    expect(item.canDelete).toBe(false);
    expect(item).not.toHaveProperty("storagePath");
    expect(JSON.stringify(item)).not.toContain(FAKE_STORAGE_PATH);
    expect(JSON.stringify(item)).not.toContain(FAKE_UID);
  });
});

describe("mapLegacyLabUploadToDetail", () => {
  it("maps unsupported lab upload detail without storage path", () => {
    const dto = mapLegacyLabUploadToDetail(unsupportedUpload());
    expect(dto.id).toBe("lab:upload_doc_secret_99");
    expect(dto.status).toBe("unsupported");
    expect(dto.canDelete).toBe(false);
    expect(dto.canRetry).toBe(true);
    expect(dto.extractionAvailability).toBe("unavailable");
    expect(dto.safeWarnings[0]).toMatch(/not available/i);
    expect(dto).not.toHaveProperty("storagePath");
    expect(JSON.stringify(dto)).not.toContain(FAKE_STORAGE_PATH);
  });

  it("maps parsed uploads to structured status", () => {
    const dto = mapLegacyLabUploadToDetail(unsupportedUpload({ status: "parsed" }));
    expect(dto.status).toBe("structured");
    expect(dto.extractionAvailability).toBe("available");
    expect(dto.canRetry).toBe(false);
  });
});

describe("parseLegacyLabDocumentId", () => {
  it("parses lab: prefixed ids and rejects others", () => {
    expect(parseLegacyLabDocumentId("lab:upload_doc_secret_99")).toBe("upload_doc_secret_99");
    expect(parseLegacyLabDocumentId("lab:")).toBeNull();
    expect(parseLegacyLabDocumentId("doc_1")).toBeNull();
    expect(parseLegacyLabDocumentId("")).toBeNull();
  });
});
