// lib/ui/labs/labUploadStatusLabel.ts
import type { LabUploadStatus } from "@/lib/contracts";
import { formatLabSourceCalendarDate } from "../../labs/labSourceDisplay";

const LABELS: Record<LabUploadStatus, string> = {
  uploaded: "Stored securely",
  processing: "Processing",
  needs_review: "Needs review",
  parsed: "Structured",
  unsupported: "Stored securely",
  failed: "Upload failed",
};

export function labUploadStatusLabel(status: LabUploadStatus): string {
  return LABELS[status];
}

export function formatLabUploadDate(iso: string | undefined): string {
  return formatLabSourceCalendarDate(iso) ?? "—";
}
