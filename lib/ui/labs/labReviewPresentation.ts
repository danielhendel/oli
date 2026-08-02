// lib/ui/labs/labReviewPresentation.ts
import type { LabCandidateReviewStatus, LabReviewCandidateDto, LabReviewSummaryDto } from "@/lib/contracts";
import { formatLabResultValue } from "@/lib/labs/labMetricCatalog";

export const LAB_REVIEW_STATUS_LABELS: Record<LabCandidateReviewStatus, string> = {
  pending_review: "Pending",
  auto_published: "Imported automatically",
  system_verified: "Verified by Oli",
  user_accepted: "Accepted",
  user_corrected: "Corrected",
  rejected: "Removed",
  unresolved: "Not yet supported",
  withheld: "Not added",
};

export const LAB_REVIEW_GROUP_LABELS = {
  needs_review: "Advanced corrections",
  unmatched: "Not yet supported",
  auto_published: "Imported automatically",
  system_verified: "Verified by Oli",
  withheld: "Not added",
} as const;

export function formatReviewDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fastingLabel(fasting: boolean | null | undefined): string | null {
  if (fasting === true) return "Fasting";
  if (fasting === false) return "Non-fasting";
  return null;
}

export function candidateDisplayName(candidate: LabReviewCandidateDto): string {
  return candidate.displayName ?? candidate.rawAnalyteLabel;
}

export function candidateResultText(candidate: LabReviewCandidateDto): string {
  if (candidate.result) {
    return formatLabResultValue(
      candidate.result.kind === "numeric" ? candidate.result.value : null,
      candidate.unit,
      candidate.result.kind === "numeric"
        ? {
            comparator: candidate.result.comparator,
            rawValueText: candidate.rawResult,
          }
        : { rawValueText: candidate.rawResult },
    );
  }
  return candidate.rawResult;
}

export function reviewSummaryCountsLabel(summary: LabReviewSummaryDto): string {
  const imported = summary.importedCount ?? 0;
  const needReview = summary.reviewNeededCount ?? 0;
  const unmatched = summary.unmatchedCount;
  return `${imported} imported / ${needReview} need review / ${unmatched} unmatched`;
}

export function reportReviewStatusLabel(status: LabReviewSummaryDto["status"]): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "ready_to_accept":
      return "Ready to finish";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "superseded":
      return "Superseded";
    case "imported":
      return "Imported";
    case "imported_with_exceptions":
      return "Imported — review remaining";
    default:
      return status;
  }
}

/** Keys and substrings that must never appear in consumer review UI. */
export const LAB_REVIEW_FORBIDDEN_LEAKS = [
  "parserId",
  "parserVersion",
  "extractionVersion",
  "sourceChecksumSha256",
  "sourceLocator",
  "canonicalMetricId",
  "quest_text",
] as const;

export function labReviewUiLeaksInternals(serialized: string): boolean {
  const lower = serialized.toLowerCase();
  for (const token of LAB_REVIEW_FORBIDDEN_LEAKS) {
    if (lower.includes(token.toLowerCase())) return true;
  }
  if (lower.includes("lab-uploads/")) return true;
  if (/[a-f0-9]{64}/.test(lower)) return true;
  return false;
}
