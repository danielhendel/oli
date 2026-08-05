import type {
  LabCandidateReviewStatus,
  LabReviewCandidateDto,
  LabReviewDetailDto,
} from "@/lib/contracts";

/** Apply a server-confirmed candidate status into the review detail DTO. */
export function applyLabReviewCandidateStatus(
  data: LabReviewDetailDto,
  candidateId: string,
  reviewStatus: LabCandidateReviewStatus,
  reviewVersion: number,
): LabReviewDetailDto {
  const mapOne = (c: LabReviewCandidateDto): LabReviewCandidateDto =>
    c.id === candidateId ? { ...c, reviewStatus } : c;

  const reportStatus =
    data.summary.status === "not_started"
      ? ("in_progress" as const)
      : data.summary.status === "accepted" ||
          data.summary.status === "rejected" ||
          data.summary.status === "imported"
        ? data.summary.status
        : data.summary.status === "imported_with_exceptions"
          ? data.summary.status
          : ("in_progress" as const);

  return {
    ...data,
    summary: {
      ...data.summary,
      reviewVersion,
      status: reportStatus,
    },
    candidates: data.candidates.map(mapOne),
    unmatched: data.unmatched.map(mapOne),
  };
}

export function countReviewActionStatuses(data: LabReviewDetailDto): {
  /** User-accepted decisions — Finish review includes these. */
  accepted: number;
  rejected: number;
  /** User-corrected decisions — Finish review includes these. */
  corrected: number;
  /**
   * Genuine pending user decisions only (`pending_review`).
   * Classified report notes (`unresolved` unmatched), withheld, and system_verified
   * are not user review tasks under zero-required-user-review.
   */
  unresolved: number;
  /** Auto-published + system-verified imports already in Labs. */
  imported: number;
  /** Classified report notes / non-result unmatched rows (not user tasks). */
  classifiedReportRows: number;
} {
  const all = [...data.candidates, ...data.unmatched];
  let accepted = 0;
  let rejected = 0;
  let corrected = 0;
  let unresolved = 0;
  let imported = 0;
  let classifiedReportRows = 0;
  for (const c of all) {
    if (c.reviewStatus === "auto_published" || c.reviewStatus === "system_verified") {
      imported += 1;
    } else if (c.reviewStatus === "user_accepted") {
      accepted += 1;
    } else if (c.reviewStatus === "rejected") {
      rejected += 1;
    } else if (c.reviewStatus === "user_corrected") {
      corrected += 1;
    } else if (c.reviewStatus === "pending_review") {
      unresolved += 1;
    } else if (c.reviewStatus === "unresolved" || c.reviewStatus === "withheld") {
      // Report notes / classified / withheld — not pending user decisions.
      classifiedReportRows += 1;
    }
  }
  return { accepted, rejected, corrected, unresolved, imported, classifiedReportRows };
}
