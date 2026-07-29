/**
 * Document status presentation helpers (pure).
 */

import type { DocumentRecordStatus } from "@oli/contracts";

export const DOCUMENT_STATUS_LABELS: Record<DocumentRecordStatus, string> = {
  uploading: "Uploading",
  stored: "Stored securely",
  processing: "Processing",
  review_needed: "Review needed",
  structured: "Structured",
  unsupported: "Extraction unavailable",
  failed: "Failed",
};

export function documentStatusLabel(status: DocumentRecordStatus): string {
  return DOCUMENT_STATUS_LABELS[status];
}

export function documentCanRetry(status: DocumentRecordStatus): boolean {
  return status === "failed" || status === "unsupported";
}

export function documentCanViewOriginal(status: DocumentRecordStatus): boolean {
  // Signed view is not implemented yet; capability flag stays false in DTOs.
  // Stored originals exist for: stored, processing, review_needed, structured, unsupported, failed.
  return (
    status === "stored" ||
    status === "processing" ||
    status === "review_needed" ||
    status === "structured" ||
    status === "unsupported" ||
    status === "failed"
  );
}
