// lib/ui/labs/labUploadStatusLabel.ts
import type { LabUploadStatus } from "@/lib/contracts";

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
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
