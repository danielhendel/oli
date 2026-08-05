/**
 * Parse Labs importSummary from a labReviews document (structural fields only).
 */

export type LabImportSummaryStructural = {
  importedCount: number;
  reviewNeededCount: number;
  unmatchedCount: number;
  reportImportStatus:
    | "imported"
    | "imported_review_recommended"
    | "review_needed"
    | "unsupported"
    | "failed"
    | "structured";
  hasAutoPublishedResults: boolean;
  hasReviewItems: boolean;
  withheldCount: number;
  reportContentCount: number;
  duplicateCount: number;
};

export function parseLabImportSummaryStructural(
  raw: Record<string, unknown> | null | undefined,
): LabImportSummaryStructural | null {
  if (!raw || typeof raw !== "object") return null;
  const summaryRaw = raw.importSummary;
  if (!summaryRaw || typeof summaryRaw !== "object") return null;
  const summary = summaryRaw as Record<string, unknown>;
  const reportImportStatus = summary.reportImportStatus;
  if (
    typeof summary.importedCount !== "number" ||
    typeof summary.reviewNeededCount !== "number" ||
    typeof summary.unmatchedCount !== "number" ||
    typeof reportImportStatus !== "string" ||
    ![
      "imported",
      "imported_review_recommended",
      "review_needed",
      "unsupported",
      "failed",
      "structured",
    ].includes(reportImportStatus)
  ) {
    return null;
  }
  return {
    importedCount: summary.importedCount,
    reviewNeededCount: summary.reviewNeededCount,
    unmatchedCount: summary.unmatchedCount,
    reportImportStatus: reportImportStatus as LabImportSummaryStructural["reportImportStatus"],
    hasAutoPublishedResults: summary.hasAutoPublishedResults === true,
    hasReviewItems: summary.hasReviewItems === true,
    withheldCount: typeof summary.withheldCount === "number" ? summary.withheldCount : 0,
    reportContentCount: typeof summary.reportContentCount === "number" ? summary.reportContentCount : 0,
    duplicateCount: typeof summary.duplicateCount === "number" ? summary.duplicateCount : 0,
  };
}
