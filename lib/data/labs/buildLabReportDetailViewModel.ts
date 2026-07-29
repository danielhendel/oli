/**
 * Pure Lab report detail view model (Phase 3B).
 *
 * Quarantines storage paths, UIDs, MIME strings, and parser internals from
 * consumer presentation. No React, RN, I/O, or Firebase.
 */

import type { LabUploadDetailResponseDto, LabUploadStatus } from "@/lib/contracts";
import { formatLabResultValue } from "@/lib/labs/labMetricCatalog";

export const LAB_REPORT_DETAIL_TITLE = "Lab report" as const;

export const LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE =
  "This report is stored, but structured extraction is not available yet." as const;

export const LAB_REPORT_ORIGINAL_DESCRIPTION =
  "Your original PDF is stored securely with your account." as const;

/** Consumer status labels mapped from the typed upload/parser status model. */
const STATUS_LABELS: Record<LabUploadStatus, string> = {
  uploaded: "Stored securely",
  processing: "Processing",
  needs_review: "Needs review",
  parsed: "Structured",
  unsupported: "Stored securely",
  failed: "Upload failed",
};

export type LabReportOriginalActionState = "coming_soon" | "available";

export type LabReportDetailResultRow = {
  key: string;
  displayName: string;
  valueText: string;
};

export type LabReportDetailResultGroup = {
  categoryKey: string;
  displayName: string;
  results: LabReportDetailResultRow[];
};

export type LabReportDetailViewModel = {
  title: typeof LAB_REPORT_DETAIL_TITLE;
  filename: string;
  statusLabel: string;
  uploadedDateLabel: string;
  labDateLabel: string | null;
  extractionMessage: string | null;
  fileTypeLabel: "PDF document" | null;
  /** Parser counters only after a genuine structured extraction attempt. */
  showParserCounts: boolean;
  parserCountsLabel: string | null;
  resultGroups: LabReportDetailResultGroup[];
  unmatchedResults: LabReportDetailResultRow[];
  originalReport: {
    heading: "Original report";
    description: typeof LAB_REPORT_ORIGINAL_DESCRIPTION;
    actionLabel: "View original PDF";
    actionState: LabReportOriginalActionState;
    actionAvailabilityLabel: "Coming soon" | null;
    actionDisabled: boolean;
    accessibilityLabel: string;
  };
};

function formatUploadDate(iso: string | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fileTypeLabelForMime(mimeType: string): "PDF document" | null {
  return mimeType.trim().toLowerCase() === "application/pdf" ? "PDF document" : null;
}

function shouldShowParserCounts(status: LabUploadStatus, extractedCount: number): boolean {
  if (status === "unsupported" || status === "uploaded" || status === "processing" || status === "failed") {
    return false;
  }
  return status === "parsed" || status === "needs_review" || extractedCount > 0;
}

function extractionMessageFor(status: LabUploadStatus, errorMessage: string | undefined): string | null {
  if (status === "unsupported") {
    return errorMessage?.trim() || LAB_REPORT_EXTRACTION_UNAVAILABLE_MESSAGE;
  }
  if (status === "failed" && errorMessage?.trim()) {
    return errorMessage.trim();
  }
  return null;
}

/**
 * Build a consumer-safe report detail model from the API DTO.
 * Intentionally omits storagePath, ids, bucket/object keys, and raw MIME.
 */
export function buildLabReportDetailViewModel(
  detail: LabUploadDetailResponseDto,
): LabReportDetailViewModel {
  const upload = detail.upload;
  const showParserCounts = shouldShowParserCounts(upload.status, upload.extractedCount);
  // Viewing via signed URL is not implemented in the consumer UI yet.
  // Keep the union so a future safe signed-URL path can flip to "available".
  const actionState = "coming_soon" as LabReportOriginalActionState;
  const actionDisabled = actionState !== "available";

  return {
    title: LAB_REPORT_DETAIL_TITLE,
    filename: upload.fileName,
    statusLabel: STATUS_LABELS[upload.status],
    uploadedDateLabel: formatUploadDate(upload.uploadedAt),
    labDateLabel: upload.labDate ? formatUploadDate(upload.labDate) : null,
    extractionMessage: extractionMessageFor(upload.status, upload.errorMessage),
    fileTypeLabel: fileTypeLabelForMime(upload.mimeType),
    showParserCounts,
    parserCountsLabel: showParserCounts
      ? `${upload.matchedCount} matched · ${upload.unmatchedCount} unmatched · ${upload.extractedCount} total`
      : null,
    resultGroups: detail.resultsByCategory.map((group) => ({
      categoryKey: group.categoryKey,
      displayName: group.displayName,
      results: group.results.map((r) => ({
        key: r.id,
        displayName: r.displayName,
        valueText: formatLabResultValue(r.value, r.unit, {
          ...(r.rawValueText !== undefined ? { rawValueText: r.rawValueText } : {}),
        }),
      })),
    })),
    unmatchedResults: detail.unmatchedResults.map((r) => ({
      key: r.id,
      displayName: r.rawName,
      valueText: formatLabResultValue(r.value, r.unit, {
        ...(r.rawValueText !== undefined ? { rawValueText: r.rawValueText } : {}),
      }),
    })),
    originalReport: {
      heading: "Original report",
      description: LAB_REPORT_ORIGINAL_DESCRIPTION,
      actionLabel: "View original PDF",
      actionState,
      actionAvailabilityLabel: actionState === "coming_soon" ? "Coming soon" : null,
      actionDisabled,
      accessibilityLabel:
        actionState === "coming_soon"
          ? "View original PDF, Coming soon"
          : "View original PDF",
    },
  };
}

/** Keys that must never appear on the consumer view model. */
export const LAB_REPORT_DETAIL_FORBIDDEN_VM_KEYS = [
  "storagePath",
  "userId",
  "uid",
  "bucket",
  "objectKey",
  "objectPath",
  "mimeType",
  "uploadId",
  "pdfUrl",
] as const;

export function labReportDetailViewModelLeaksInternals(serialized: string): boolean {
  const lower = serialized.toLowerCase();
  if (lower.includes("lab-uploads/")) return true;
  if (lower.includes("storage:")) return true;
  if (lower.includes("application/pdf")) return true;
  if (lower.includes("follow-up sprint")) return true;
  if (lower.includes("signed pdf download")) return true;
  if (/\b[0-9]+\s+matched\b/.test(lower) && /\bunmatched\b/.test(lower)) return true;
  if (lower.includes("mime:")) return true;
  return false;
}
