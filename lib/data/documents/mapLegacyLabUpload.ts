/**
 * Map legacy labUploads records into Document OS safe list/detail DTOs (pure).
 * Preserves DirectLabs / existing stored reports without mutating them.
 */

import type {
  DocumentDetailDto,
  DocumentListItemDto,
  DocumentRecordStatus,
  LabUploadDto,
  LabUploadStatus,
} from "@oli/contracts";
import { documentCanRetry } from "./documentStatus";

function mapLabStatus(status: LabUploadStatus): DocumentRecordStatus {
  switch (status) {
    case "uploaded":
      return "stored";
    case "processing":
      return "processing";
    case "needs_review":
      return "review_needed";
    case "parsed":
      return "structured";
    case "unsupported":
      return "unsupported";
    case "failed":
      return "failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function mapLegacyLabUploadToListItem(upload: LabUploadDto): DocumentListItemDto {
  const status = mapLabStatus(upload.status);
  return {
    id: `lab:${upload.id}`,
    filename: upload.fileName,
    domain: "labs",
    documentType: "lab_report",
    uploadedAt: upload.uploadedAt,
    status,
    // View-original and account-wide delete are not fully covered yet.
    canViewOriginal: false,
    canRetry: documentCanRetry(status),
    canDelete: false,
    legacySource: "lab_upload",
  };
}

export function mapLegacyLabUploadToDetail(upload: LabUploadDto): DocumentDetailDto {
  const status = mapLabStatus(upload.status);
  const safeWarnings: string[] = [];
  if (status === "unsupported") {
    safeWarnings.push(
      upload.errorMessage?.trim() ||
        "This report is stored, but structured extraction is not available yet.",
    );
  } else if (status === "failed" && upload.errorMessage?.trim()) {
    safeWarnings.push(upload.errorMessage.trim());
  }

  return {
    id: `lab:${upload.id}`,
    filename: upload.fileName,
    domain: "labs",
    documentType: "lab_report",
    uploadedAt: upload.uploadedAt,
    status,
    processingState: null,
    extractionAvailability: status === "structured" ? "available" : "unavailable",
    safeWarnings,
    canViewOriginal: false,
    canRetry: documentCanRetry(status),
    canDelete: false,
    legacySource: "lab_upload",
  };
}

export function parseLegacyLabDocumentId(documentId: string): string | null {
  if (!documentId.startsWith("lab:")) return null;
  const id = documentId.slice(4);
  return id.length > 0 ? id : null;
}
