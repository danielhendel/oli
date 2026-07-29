/**
 * Document ingestion job state machine (pure).
 * Invalid transitions fail closed.
 */

import type { DocumentIngestionJobState, DocumentRecordStatus } from "@/lib/contracts";

export const DOCUMENT_INGESTION_JOB_STATES = [
  "created",
  "validating",
  "validation_failed",
  "storing",
  "stored",
  "classifying",
  "extraction_queued",
  "extracting",
  "extraction_failed",
  "extraction_unsupported",
  "extracted",
  "validation_pending",
  "review_needed",
  "accepted",
  "completed",
  "cancelled",
] as const satisfies readonly DocumentIngestionJobState[];

const ALLOWED_TRANSITIONS: Record<DocumentIngestionJobState, readonly DocumentIngestionJobState[]> = {
  created: ["validating", "cancelled"],
  validating: ["validation_failed", "storing", "cancelled"],
  validation_failed: ["validating", "validation_pending", "cancelled"],
  storing: ["stored", "validation_failed", "cancelled"],
  stored: ["classifying", "cancelled"],
  classifying: ["extraction_queued", "review_needed", "cancelled"],
  extraction_queued: ["extracting", "cancelled"],
  extracting: ["extracted", "extraction_failed", "extraction_unsupported", "cancelled"],
  extraction_failed: ["extraction_queued", "cancelled"],
  extraction_unsupported: ["completed", "extraction_queued", "cancelled"],
  extracted: ["validation_pending", "cancelled"],
  validation_pending: ["validation_failed", "review_needed", "accepted", "cancelled"],
  review_needed: ["accepted", "cancelled", "extraction_queued"],
  accepted: ["completed", "cancelled"],
  completed: ["extraction_queued"], // reprocess starts a new path via queued
  cancelled: [],
};

export type DocumentStateTransitionResult =
  | { ok: true; from: DocumentIngestionJobState; to: DocumentIngestionJobState }
  | { ok: false; from: DocumentIngestionJobState; to: DocumentIngestionJobState; reason: "invalid_transition" | "idempotent_noop" };

/**
 * Attempt a state transition. Same-state is treated as idempotent noop (ok:false with reason).
 */
export function transitionDocumentIngestionJobState(
  from: DocumentIngestionJobState,
  to: DocumentIngestionJobState,
): DocumentStateTransitionResult {
  if (from === to) {
    return { ok: false, from, to, reason: "idempotent_noop" };
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return { ok: false, from, to, reason: "invalid_transition" };
  }
  return { ok: true, from, to };
}

export function assertDocumentIngestionTransition(
  from: DocumentIngestionJobState,
  to: DocumentIngestionJobState,
): void {
  const result = transitionDocumentIngestionJobState(from, to);
  if (!result.ok && result.reason === "invalid_transition") {
    throw new Error(`Invalid document ingestion transition: ${from} -> ${to}`);
  }
}

/** Map terminal / durable job states onto consumer document record status. */
export function documentRecordStatusFromJobState(state: DocumentIngestionJobState): DocumentRecordStatus {
  switch (state) {
    case "created":
    case "validating":
    case "storing":
      return "uploading";
    case "validation_failed":
      return "failed";
    case "stored":
      return "stored";
    case "classifying":
    case "extraction_queued":
    case "extracting":
    case "validation_pending":
      return "processing";
    case "extraction_failed":
    case "cancelled":
      return "failed";
    case "extraction_unsupported":
    case "completed":
      return "unsupported";
    case "extracted":
    case "review_needed":
      return "review_needed";
    case "accepted":
      return "structured";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function isTerminalDocumentIngestionState(state: DocumentIngestionJobState): boolean {
  return (
    state === "completed" ||
    state === "cancelled" ||
    state === "validation_failed" ||
    state === "extraction_failed" ||
    state === "extraction_unsupported"
  );
}
