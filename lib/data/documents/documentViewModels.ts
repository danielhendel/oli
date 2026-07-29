/**
 * Consumer presentation view models for Document Ingestion OS (pure).
 * Never includes storage paths, UIDs, checksums, MIME, parser IDs, or signed URLs.
 */

import type {
  DocumentDetailDto,
  DocumentListItemDto,
  DocumentRecordStatus,
} from "@oli/contracts";
import { documentStatusLabel } from "./documentStatus";

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
  canDelete: boolean;
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

export function buildDocumentListItemViewModel(item: DocumentListItemDto): DocumentListItemViewModel {
  return {
    id: item.id,
    filename: item.filename,
    domainLabel: DOMAIN_LABELS[item.domain],
    documentTypeLabel: TYPE_LABELS[item.documentType],
    uploadedDateLabel: formatUploadDate(item.uploadedAt),
    statusLabel: documentStatusLabel(item.status),
    canRetry: item.canRetry,
    canDelete: item.canDelete,
    canViewOriginal: item.canViewOriginal,
  };
}

function extractionMessageFor(status: DocumentRecordStatus, warnings: string[]): string | null {
  if (status === "unsupported") {
    return warnings[0] ?? "This document is stored, but structured extraction is not available yet.";
  }
  if (status === "failed") {
    return warnings[0] ?? "Processing failed. You can retry when available.";
  }
  if (status === "review_needed") {
    return "Structured extraction requires review before it can become trusted health data.";
  }
  if (status === "processing") {
    return "Processing this document…";
  }
  return null;
}

export function buildDocumentDetailViewModel(detail: DocumentDetailDto): DocumentDetailViewModel {
  return {
    title: TYPE_LABELS[detail.documentType],
    filename: detail.filename,
    domainLabel: DOMAIN_LABELS[detail.domain],
    documentTypeLabel: TYPE_LABELS[detail.documentType],
    uploadedDateLabel: formatUploadDate(detail.uploadedAt),
    statusLabel: documentStatusLabel(detail.status),
    processingLabel: detail.processingState ? detail.processingState.replace(/_/g, " ") : null,
    extractionMessage: extractionMessageFor(detail.status, detail.safeWarnings),
    safeWarnings: detail.safeWarnings,
    canRetry: detail.canRetry,
    canDelete: detail.canDelete,
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
