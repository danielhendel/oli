/**
 * Bound "Processing…" so unsupported/failed jobs cannot leave consumers stuck forever.
 * Pure — callers persist when reason !== unchanged.
 */

import type { DocumentIngestionJobState, DocumentRecordStatus } from "@oli/contracts";
import { documentRecordStatusFromJobState } from "./documentStateMachine";

/** Jobs stuck in non-terminal processing longer than this are failed closed. */
export const DOCUMENT_PROCESSING_STALE_MS = 10 * 60 * 1000;

const TERMINAL_JOB_STATES = new Set<DocumentIngestionJobState>([
  "extraction_unsupported",
  "extraction_failed",
  "completed",
  "cancelled",
  "accepted",
  "validation_failed",
]);

export type DocumentProcessingReconcileResult = {
  status: DocumentRecordStatus;
  reason: "unchanged" | "job_terminal" | "stale_timeout";
};

export function reconcileDocumentProcessingStatus(args: {
  documentStatus: DocumentRecordStatus;
  jobState: DocumentIngestionJobState | null;
  jobUpdatedAt: string | null;
  nowMs?: number;
}): DocumentProcessingReconcileResult {
  if (args.documentStatus !== "processing") {
    return { status: args.documentStatus, reason: "unchanged" };
  }

  if (args.jobState && TERMINAL_JOB_STATES.has(args.jobState)) {
    const mapped = documentRecordStatusFromJobState(args.jobState);
    if (mapped !== "processing") {
      return { status: mapped, reason: "job_terminal" };
    }
  }

  const nowMs = args.nowMs ?? Date.now();
  const updatedMs = args.jobUpdatedAt ? Date.parse(args.jobUpdatedAt) : Number.NaN;
  if (Number.isFinite(updatedMs) && nowMs - updatedMs > DOCUMENT_PROCESSING_STALE_MS) {
    return { status: "failed", reason: "stale_timeout" };
  }

  // No job yet / still actively processing within bound — leave as processing.
  return { status: "processing", reason: "unchanged" };
}
