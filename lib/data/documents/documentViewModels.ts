/**
 * Consumer presentation view models for Document Ingestion OS (pure).
 * Never includes storage paths, UIDs, checksums, MIME, parser IDs, or signed URLs.
 */

import type {
  DocumentDetailDto,
  DocumentDomain,
  DocumentListItemDto,
  DocumentType,
} from "@oli/contracts";
import {
  DOCUMENT_DELETE_ACTION_LABEL,
  documentDeleteActionView,
  resolveDocumentDeleteCapability,
} from "./documentDeleteCapability";
import { documentCanRetry, documentRetryLabel, documentStatusLabel } from "./documentStatus";

export const DOCUMENT_DETAIL_FORBIDDEN_VM_KEYS = [
  "storagePath",
  "storageObjectId",
  "userId",
  "uid",
  "bucket",
  "objectKey",
  "objectPath",
  "mimeType",
  "mediaType",
  "checksum",
  "checksumSha256",
  "parserId",
  "parserVersion",
  "signedUrl",
  "pdfUrl",
  "requestId",
] as const;

export type DocumentListItemViewModel = {
  id: string;
  filename: string;
  domainLabel: string;
  documentTypeLabel: string;
  uploadedDateLabel: string;
  statusLabel: string;
  canRetry: boolean;
  canDelete: boolean;
  canViewOriginal: boolean;
};

export type DocumentDetailViewModel = {
  /** Navigation / chrome title for the consumer surface. */
  consumerTitle: string;
  title: string;
  filename: string;
  domainLabel: string;
  documentTypeLabel: string;
  uploadedDateLabel: string;
  statusLabel: string;
  processingLabel: string | null;
  extractionMessage: string | null;
  safeWarnings: string[];
  canRetry: boolean;
  /** True only when Retry processing is an honest consumer action. */
  canRetryProcessing: boolean;
  retryLabel: "Retry processing" | "Reprocess report" | null;
  canDelete: boolean;
  /** Consumer-safe delete action label — never exposes ownership implementation. */
  deleteActionLabel: typeof DOCUMENT_DELETE_ACTION_LABEL | null;
  reviewActionAvailable: boolean;
  viewLabsActionAvailable: boolean;
  importedCount: number | null;
  originalFile: {
    heading: "Original file";
    description: string;
    actionLabel: "View original";
    actionDisabled: boolean;
    actionAvailabilityLabel: "Coming soon" | null;
  };
};

const DOMAIN_LABELS: Record<DocumentListItemDto["domain"], string> = {
  labs: "Labs",
  scans: "Scans",
  dna: "DNA",
  medical_history: "Medical history",
  medications: "Medications",
  supplements: "Supplements",
  other_health_record: "Health record",
};

const TYPE_LABELS: Record<DocumentListItemDto["documentType"], string> = {
  lab_report: "Lab report",
  dexa_report: "DEXA report",
  imaging_report: "Imaging report",
  dna_report: "DNA report",
  medical_record: "Medical record",
  medication_record: "Medication record",
  supplement_record: "Supplement record",
  unknown: "Unknown document",
};

function formatUploadDate(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Consumer navigation title — Labs is always Lab report; other domains use approved type titles. */
export function documentConsumerTitle(domain: DocumentDomain, documentType: DocumentType): string {
  if (domain === "labs") return "Lab report";
  if (documentType === "unknown") return "Document";
  return TYPE_LABELS[documentType];
}

export function buildDocumentListItemViewModel(item: DocumentListItemDto): DocumentListItemViewModel {
  const canRetry = documentCanRetry(item.status);
  const statusLabel =
    item.consumerStatusLabel ??
    (item.domain === "labs" && item.status === "structured"
      ? "Imported"
      : documentStatusLabel(item.status));
  return {
    id: item.id,
    filename: item.filename,
    domainLabel: DOMAIN_LABELS[item.domain],
    documentTypeLabel: TYPE_LABELS[item.documentType],
    uploadedDateLabel: formatUploadDate(item.uploadedAt),
    statusLabel,
    canRetry,
    canDelete: item.canDelete,
    canViewOriginal: item.canViewOriginal,
  };
}

function extractionMessageFor(detail: DocumentDetailDto): string | null {
  if (detail.consumerMessage) return detail.consumerMessage;
  if (detail.domain === "labs" && detail.status === "structured") {
    const n = detail.importedCount;
    return n != null && n > 0
      ? `${n} results were added to Labs.\nNo review is required.`
      : "Results were added to Labs.\nNo review is required.";
  }
  if (detail.status === "unsupported") {
    return (
      detail.safeWarnings[0] ??
      "This document is stored, but structured extraction is not available yet. You can reprocess it if a supported Labs parser is available."
    );
  }
  if (detail.status === "failed") {
    return detail.safeWarnings[0] ?? "Processing failed. You can retry when available.";
  }
  if (detail.status === "review_needed") {
    // Structural truth: never show review-required copy when no pending decisions.
    if (
      typeof detail.reviewNeededCount === "number" &&
      detail.reviewNeededCount === 0 &&
      (detail.hasAutoPublishedResults === true || (detail.importedCount ?? 0) > 0)
    ) {
      const n = detail.importedCount ?? 0;
      return n > 0
        ? `${n} results were added to Labs.\nNo review is required.`
        : "Results were added to Labs.\nNo review is required.";
    }
    return "Structured extraction requires review before it can become trusted health data.";
  }
  if (detail.status === "processing") {
    return "Processing this document…";
  }
  return null;
}

export function buildDocumentDetailViewModel(detail: DocumentDetailDto): DocumentDetailViewModel {
  const consumerTitle = documentConsumerTitle(detail.domain, detail.documentType);
  const canRetryProcessing = documentCanRetry(detail.status);
  const retryLabel = documentRetryLabel(detail.status);
  const deleteCapability = resolveDocumentDeleteCapability({
    canDelete: detail.canDelete,
    legacySource: detail.legacySource,
    status: detail.status,
  });
  const deleteAction = documentDeleteActionView(deleteCapability);

  const importedTerminal =
    detail.consumerStatus === "imported" ||
    detail.consumerStatus === "imported_with_notes" ||
    detail.consumerStatus === "imported_with_withheld_results" ||
    (detail.domain === "labs" &&
      detail.status === "structured" &&
      (detail.reviewNeededCount ?? 0) === 0) ||
    (detail.domain === "labs" &&
      detail.status === "review_needed" &&
      (detail.importedCount ?? 0) > 0 &&
      (detail.reviewNeededCount ?? 0) === 0 &&
      detail.hasReviewItems !== true);

  const statusLabel =
    importedTerminal
      ? "Imported"
      : detail.consumerStatus === "review_available"
        ? "Review needed"
        : documentStatusLabel(detail.status);

  const reviewActionAvailable =
    detail.reviewActionAvailable === true ||
    (!importedTerminal &&
      detail.status === "review_needed" &&
      (detail.reviewNeededCount == null || detail.reviewNeededCount > 0));

  const viewLabsActionAvailable =
    detail.viewLabsActionAvailable === true || importedTerminal;

  return {
    consumerTitle,
    title: consumerTitle,
    filename: detail.filename,
    domainLabel: DOMAIN_LABELS[detail.domain],
    documentTypeLabel: TYPE_LABELS[detail.documentType],
    uploadedDateLabel: formatUploadDate(detail.uploadedAt),
    statusLabel,
    processingLabel: detail.processingState ? detail.processingState.replace(/_/g, " ") : null,
    extractionMessage: extractionMessageFor(detail),
    safeWarnings: detail.safeWarnings,
    canRetry: canRetryProcessing,
    canRetryProcessing,
    retryLabel,
    canDelete: deleteAction.canDelete,
    deleteActionLabel: deleteAction.canDelete ? deleteAction.actionLabel : null,
    reviewActionAvailable,
    viewLabsActionAvailable,
    importedCount: typeof detail.importedCount === "number" ? detail.importedCount : null,
    originalFile: {
      heading: "Original file",
      description: "Your original file is stored securely with your account.",
      actionLabel: "View original",
      actionDisabled: true,
      actionAvailabilityLabel: "Coming soon",
    },
  };
}

export function documentViewModelLeaksInternals(serialized: string): boolean {
  const lower = serialized.toLowerCase();
  if (lower.includes("users/") && lower.includes("/documents/")) return true;
  if (lower.includes("lab-uploads/")) return true;
  if (lower.includes("storageobjectid")) return true;
  if (lower.includes("checksum")) return true;
  if (lower.includes("application/pdf")) return true;
  if (lower.includes("signedurl") || lower.includes("signed url")) return true;
  if (lower.includes("parserid") || lower.includes("parserversion")) return true;
  if (/\buid\b/.test(lower)) return true;
  return false;
}
