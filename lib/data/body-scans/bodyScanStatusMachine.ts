/**
 * Body Scan status machine + consumer copy (pure).
 *
 * The client never writes status; it only renders it. Server transitions are validated
 * here so both sides share one definition of what is reachable.
 */

import type { BodyScanDraftStatus, BodyScanStatus } from "@oli/contracts";

const ALLOWED_TRANSITIONS: Record<BodyScanStatus, readonly BodyScanStatus[]> = {
  uploading: ["processing", "failed", "deleting"],
  processing: ["needs_review", "verified", "failed", "deleting"],
  needs_review: ["processing", "verified", "failed", "deleting"],
  verified: ["processing", "needs_review", "deleting"],
  failed: ["processing", "deleting"],
  deleting: ["deleted"],
  deleted: [],
};

export type BodyScanTransitionResult =
  | { ok: true }
  | { ok: false; reason: "idempotent_noop" }
  | { ok: false; reason: "invalid_transition" };

export function transitionBodyScanStatus(
  from: BodyScanStatus,
  to: BodyScanStatus,
): BodyScanTransitionResult {
  if (from === to) return { ok: false, reason: "idempotent_noop" };
  if (ALLOWED_TRANSITIONS[from].includes(to)) return { ok: true };
  return { ok: false, reason: "invalid_transition" };
}

export function isTerminalBodyScanStatus(status: BodyScanStatus): boolean {
  return status === "verified" || status === "failed" || status === "deleted";
}

/** Statuses where polling should stop because processing has settled. */
export function isSettledBodyScanStatus(status: BodyScanStatus): boolean {
  return status === "needs_review" || isTerminalBodyScanStatus(status);
}

export const BODY_SCAN_STATUS_COPY: Record<BodyScanStatus, string> = {
  uploading: "Uploading report…",
  processing: "Reading your Body Scan…",
  needs_review: "Review the extracted results before saving.",
  verified: "Results available.",
  failed: "We couldn’t read this report.",
  deleting: "Removing this Body Scan…",
  deleted: "This Body Scan was removed.",
};

export function bodyScanStatusLabel(status: BodyScanStatus): string {
  return BODY_SCAN_STATUS_COPY[status];
}

/**
 * Map an adapter draft outcome to a scan status.
 * A draft never lands on `verified` — confirmation is always an explicit user act.
 */
export function bodyScanStatusFromDraftStatus(draftStatus: BodyScanDraftStatus): BodyScanStatus {
  switch (draftStatus) {
    case "failed":
      return "failed";
    case "extracted":
    case "review_needed":
    case "partial":
    case "unsupported":
      return "needs_review";
    default: {
      const _exhaustive: never = draftStatus;
      return _exhaustive;
    }
  }
}

export function canReviewBodyScan(status: BodyScanStatus): boolean {
  return status === "needs_review" || status === "verified";
}

export function canReprocessBodyScan(status: BodyScanStatus): boolean {
  return status === "needs_review" || status === "failed" || status === "verified";
}

export function canDeleteBodyScan(status: BodyScanStatus): boolean {
  return status !== "deleting" && status !== "deleted";
}
