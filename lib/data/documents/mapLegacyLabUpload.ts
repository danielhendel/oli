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
    // View-original remains deferred; per-document delete is supported via Document OS DELETE.
    // Legacy lab:* ids cannot reprocess via Document OS (API rejects) — never expose Retry.
    canViewOriginal: false,
    canRetry: false,
    canDelete: true,
    legacySource: "lab_upload",
    ...(upload.labDate ? { collectedAt: upload.labDate } : {}),
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
    canRetry: false,
    canDelete: true,
    legacySource: "lab_upload",
    ...(upload.labDate ? { collectedAt: upload.labDate } : {}),
  };
}

export function parseLegacyLabDocumentId(documentId: string): string | null {
  if (!documentId.startsWith("lab:")) return null;
  const id = documentId.slice(4);
  return id.length > 0 ? id : null;
}
