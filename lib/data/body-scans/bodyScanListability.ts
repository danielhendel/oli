/**
 * Shared listability predicate for Body Scan list pages.
 * Mirrors server `isListableBodyScan` without importing the Express route module.
 */
import type { BodyScanStatus } from "@oli/contracts";

export function isListableBodyScanForTest(record: {
  status: BodyScanStatus | string;
  retentionStatus: "active" | "pending_delete" | "deleted" | string;
}): boolean {
  if (record.retentionStatus === "deleted") return false;
  if (record.status === "deleted" || record.status === "uploading") return false;
  return true;
}
