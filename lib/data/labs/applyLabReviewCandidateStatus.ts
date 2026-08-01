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
      : data.summary.status === "accepted" || data.summary.status === "rejected"
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
  accepted: number;
  rejected: number;
  corrected: number;
  unresolved: number;
} {
  const all = [...data.candidates, ...data.unmatched];
  let accepted = 0;
  let rejected = 0;
  let corrected = 0;
  let unresolved = 0;
  for (const c of all) {
    if (c.reviewStatus === "accepted") accepted += 1;
    else if (c.reviewStatus === "rejected") rejected += 1;
    else if (c.reviewStatus === "corrected") corrected += 1;
    else unresolved += 1;
  }
  return { accepted, rejected, corrected, unresolved };
}
