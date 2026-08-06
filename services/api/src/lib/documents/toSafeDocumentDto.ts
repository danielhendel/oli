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
import {
  deriveLabReportConsumerPresentation,
  type LabReportConsumerPresentation,
} from "../../../../../lib/labs/deriveLabReportConsumerState";
import type { LabReportDates } from "./loadLabReportDates";

export type LabsImportSummaryFields = {
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
  withheldCount?: number;
  reportContentCount?: number;
  duplicateCount?: number;
};

export function labsConsumerPresentationFromRecord(args: {
  status: DocumentRecordStatus;
  importSummary?: LabsImportSummaryFields | null | undefined;
}): LabReportConsumerPresentation | null {
  const summary = args.importSummary ?? null;
  if (!summary && args.status !== "review_needed" && args.status !== "structured") {
    return null;
  }
  const classified =
    (summary?.reportContentCount ?? 0) + (summary?.duplicateCount ?? 0);
  return deriveLabReportConsumerPresentation({
    processingStatus: args.status,
    importedCount: summary?.importedCount ?? 0,
    genuinePendingDecisionCount: summary?.reviewNeededCount ?? (summary?.hasReviewItems ? 1 : 0),
    unmatchedGenuineAnalyteCount: summary?.unmatchedCount ?? 0,
    withheldGenuineResultCount: summary?.withheldCount ?? 0,
    classifiedReportRowCount: classified,
  });
}

export function toDocumentListItemDto(
  record: UserDocumentRecord,
  opts?: {
    importSummary?: LabsImportSummaryFields | null;
    reportDates?: LabReportDates | null;
  },
): DocumentListItemDto {
  const presentation =
    record.domain === "labs"
      ? labsConsumerPresentationFromRecord({
          status: record.status,
          importSummary: opts?.importSummary ?? null,
        })
      : null;
  return {
    id: record.id,
    filename: record.safeDisplayFilename,
    domain: record.domain,
    documentType: record.documentType,
    uploadedAt: record.uploadedAt,
    status: presentation?.documentRecordStatus
      ? (presentation.documentRecordStatus as DocumentRecordStatus)
      : record.status,
    canViewOriginal: false,
    canRetry: documentCanRetry(record.status),
    // Per-document delete is implemented for Document OS records.
    canDelete: record.status !== "uploading",
    legacySource: "document",
    ...(opts?.reportDates?.collectedAt ? { collectedAt: opts.reportDates.collectedAt } : {}),
    ...(presentation
      ? {
          consumerStatusLabel: presentation.statusLabel,
          ...(opts?.importSummary
            ? { importedCount: opts.importSummary.importedCount }
            : {}),
        }
      : {}),
  };
}

export function toDocumentDetailDto(args: {
  record: UserDocumentRecord;
  processingState: DocumentIngestionJobState | null;
  safeWarnings: string[];
  importSummary?: LabsImportSummaryFields | null;
  reportDates?: LabReportDates | null;
}): DocumentDetailDto {
  const { record } = args;
  const summary = args.importSummary;
  const presentation =
    record.domain === "labs"
      ? labsConsumerPresentationFromRecord({ status: record.status, importSummary: summary })
      : null;

  const effectiveStatus =
    (presentation?.documentRecordStatus as DocumentRecordStatus | null) ?? record.status;

  const extractionAvailability =
    effectiveStatus === "structured"
      ? ("available" as const)
      : effectiveStatus === "review_needed"
        ? ("review_needed" as const)
        : effectiveStatus === "processing"
          ? ("pending" as const)
          : ("unavailable" as const);

  return {
    id: record.id,
    filename: record.safeDisplayFilename,
    domain: record.domain,
    documentType: record.documentType,
    uploadedAt: record.uploadedAt,
    status: effectiveStatus,
    processingState: args.processingState,
    extractionAvailability,
    safeWarnings: args.safeWarnings,
    canViewOriginal: false,
    canRetry: documentCanRetry(effectiveStatus),
    canDelete: record.status !== "uploading",
    legacySource: "document",
    ...(args.reportDates?.collectedAt ? { collectedAt: args.reportDates.collectedAt } : {}),
    ...(args.reportDates?.receivedAt ? { receivedAt: args.reportDates.receivedAt } : {}),
    ...(args.reportDates?.reportedAt ? { reportedAt: args.reportDates.reportedAt } : {}),
    ...(summary
      ? {
          importedCount: summary.importedCount,
          reviewNeededCount: summary.reviewNeededCount,
          unmatchedCount: summary.unmatchedCount,
          reportImportStatus: summary.reportImportStatus,
          hasAutoPublishedResults: summary.hasAutoPublishedResults,
          hasReviewItems: summary.hasReviewItems,
          pendingDecisionCount: summary.reviewNeededCount,
          withheldCount: summary.withheldCount ?? 0,
          classifiedReportRowCount:
            (summary.reportContentCount ?? 0) + (summary.duplicateCount ?? 0),
        }
      : {}),
    ...(presentation
      ? {
          consumerStatus: presentation.consumerStatus,
          ...(presentation.consumerMessage
            ? { consumerMessage: presentation.consumerMessage }
            : {}),
          reviewActionAvailable: presentation.reviewActionAvailable,
          viewLabsActionAvailable: presentation.viewLabsActionAvailable,
          correctionActionAvailable: presentation.correctionActionAvailable,
        }
      : {}),
  };
}

export function safeWarningsForStatus(
  status: DocumentRecordStatus,
  errorCode?: string,
  importSummary?: LabsImportSummaryFields | null,
): string[] {
  const presentation =
    status === "review_needed" || status === "structured" || importSummary
      ? labsConsumerPresentationFromRecord({ status, importSummary })
      : null;
  if (presentation?.consumerStatus === "imported" ||
      presentation?.consumerStatus === "imported_with_notes" ||
      presentation?.consumerStatus === "imported_with_withheld_results") {
    return presentation.consumerMessage ? [presentation.consumerMessage.replace(/\n/g, " ")] : [];
  }
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
