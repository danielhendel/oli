/**
 * Short user-facing status labels for Body Scan category / history navigation.
 * Does not replace BODY_SCAN_STATUS_COPY used on detail/review surfaces.
 */
import type { BodyScanStatus } from "@oli/contracts";

export type BodyScanNavStatusLabel =
  | "Processing"
  | "Needs review"
  | "Verified"
  | "Needs attention"
  | "Unable to process";

const NAV_STATUS_LABELS: Partial<Record<BodyScanStatus, BodyScanNavStatusLabel>> = {
  uploading: "Processing",
  processing: "Processing",
  needs_review: "Needs review",
  verified: "Verified",
  failed: "Unable to process",
  deleting: "Needs attention",
  deleted: "Needs attention",
};

export function bodyScanNavStatusLabel(status: BodyScanStatus): BodyScanNavStatusLabel {
  return NAV_STATUS_LABELS[status] ?? "Needs attention";
}
