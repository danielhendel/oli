/**
 * Safe DTO mappers for Document Ingestion OS (server).
 * Never include storage paths, checksums, UIDs, MIME, or parser internals.
 */

import type {
  DocumentDetailDto,
  DocumentIngestionJobState,
  DocumentListItemDto,
  DocumentRecordStatus,
  UserDocumentRecord,
} from "@oli/contracts";
import { documentCanRetry } from "../../../../../lib/data/documents/documentStatus";

export function toDocumentListItemDto(record: UserDocumentRecord): DocumentListItemDto {
  return {
    id: record.id,
    filename: record.safeDisplayFilename,
    domain: record.domain,
    documentType: record.documentType,
    uploadedAt: record.uploadedAt,
    status: record.status,
    canViewOriginal: false,
    canRetry: documentCanRetry(record.status),
    // Per-document delete is implemented for Document OS records.
    canDelete: record.status !== "uploading",
    legacySource: "document",
  };
}

export function toDocumentDetailDto(args: {
  record: UserDocumentRecord;
  processingState: DocumentIngestionJobState | null;
  safeWarnings: string[];
  importSummary?: {
    importedCount: number;
    reviewNeededCount: number;
    unmatchedCount: number;
    reportImportStatus:
      | "imported"
      | "imported_review_recommended"
      | "review_needed"
      | "unsupported"
      | "failed"
      | "structured";
    hasAutoPublishedResults: boolean;
    hasReviewItems: boolean;
  } | null;
}): DocumentDetailDto {
  const { record } = args;
  const extractionAvailability =
    record.status === "structured"
      ? ("available" as const)
      : record.status === "review_needed"
        ? ("review_needed" as const)
        : record.status === "processing"
          ? ("pending" as const)
          : ("unavailable" as const);

  const summary = args.importSummary;
  return {
    id: record.id,
    filename: record.safeDisplayFilename,
    domain: record.domain,
    documentType: record.documentType,
    uploadedAt: record.uploadedAt,
    status: record.status,
    processingState: args.processingState,
    extractionAvailability,
    safeWarnings: args.safeWarnings,
    canViewOriginal: false,
    canRetry: documentCanRetry(record.status),
    canDelete: record.status !== "uploading",
    legacySource: "document",
    ...(summary
      ? {
          importedCount: summary.importedCount,
          reviewNeededCount: summary.reviewNeededCount,
          unmatchedCount: summary.unmatchedCount,
          reportImportStatus: summary.reportImportStatus,
          hasAutoPublishedResults: summary.hasAutoPublishedResults,
          hasReviewItems: summary.hasReviewItems,
        }
      : {}),
  };
}

export function safeWarningsForStatus(
  status: DocumentRecordStatus,
  errorCode?: string,
  importSummary?: { hasAutoPublishedResults?: boolean; hasReviewItems?: boolean } | null,
): string[] {
  if (status === "unsupported") {
    return ["This document is stored, but structured extraction is not available yet."];
  }
  if (status === "failed") {
    if (errorCode === "VALIDATION_FAILED") {
      return ["This file could not be validated. Please try a different file."];
    }
    return ["Processing failed. Retry is available."];
  }
  if (status === "review_needed") {
    if (importSummary?.hasAutoPublishedResults && importSummary.hasReviewItems) {
      return [
        "High-confidence results were added to Labs. Some extracted rows still need your review.",
      ];
    }
    if (importSummary?.hasAutoPublishedResults && !importSummary.hasReviewItems) {
      return ["Results were imported to Labs from this report."];
    }
    return ["Structured extraction requires review before it can become trusted health data."];
  }
  return [];
}
