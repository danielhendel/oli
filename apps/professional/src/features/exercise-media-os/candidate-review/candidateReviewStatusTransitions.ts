import type { CandidateReviewStatus } from "./types";
import { CANDIDATE_REVIEW_STATUSES } from "./types";

export { CANDIDATE_REVIEW_STATUSES };

const TRANSITION_MAP: Record<CandidateReviewStatus, readonly CandidateReviewStatus[]> = {
  missing: ["draft", "dev-test"],
  draft: ["dev-test", "needs-revision", "rejected", "approved-master"],
  "dev-test": ["needs-revision", "rejected", "approved-master"],
  "needs-revision": ["draft", "dev-test", "rejected"],
  rejected: ["superseded"],
  "approved-master": ["superseded"],
  superseded: [],
};

export type CandidateTransitionContext = {
  readonly approvalEligible: boolean;
  readonly hasRejectionReasons: boolean;
  readonly hasCriticalFindings: boolean;
  readonly hasReviewerNotes: boolean;
  readonly hasLineageSupersededBy: boolean;
};

/** Allowed next statuses for a candidate review status (before context gates). */
export function getAllowedCandidateReviewTransitions(
  status: CandidateReviewStatus,
): readonly CandidateReviewStatus[] {
  return TRANSITION_MAP[status];
}

function isContextAllowedTransition(
  from: CandidateReviewStatus,
  to: CandidateReviewStatus,
  context: CandidateTransitionContext,
): boolean {
  if (to === "approved-master" && !context.approvalEligible) {
    return false;
  }

  if (to === "rejected" && !context.hasRejectionReasons && !context.hasCriticalFindings) {
    return false;
  }

  if (to === "needs-revision" && !context.hasReviewerNotes && !context.hasCriticalFindings) {
    return false;
  }

  if (to === "superseded" && from === "rejected" && !context.hasLineageSupersededBy) {
    return false;
  }

  if (from === "missing" && to === "approved-master") {
    return false;
  }

  if (from === "rejected" && to === "approved-master") {
    return false;
  }

  if (from === "approved-master" && (to === "draft" || to === "dev-test" || to === "needs-revision")) {
    return false;
  }

  if (from === "superseded") {
    return false;
  }

  return true;
}

/** Whether a status transition is allowed given current candidate context. */
export function canTransitionCandidateReviewStatus(
  from: CandidateReviewStatus,
  to: CandidateReviewStatus,
  context: CandidateTransitionContext,
): boolean {
  if (from === to) {
    return true;
  }

  if (!getAllowedCandidateReviewTransitions(from).includes(to)) {
    return false;
  }

  return isContextAllowedTransition(from, to, context);
}

export type TransitionCandidateReviewStatusInput<T extends { status: CandidateReviewStatus; updatedAt: string }> = {
  readonly candidate: T;
  readonly nextStatus: CandidateReviewStatus;
  readonly context: CandidateTransitionContext;
  readonly updatedAt: string;
};

export type TransitionCandidateReviewStatusResult<T> =
  | { readonly ok: true; readonly candidate: T }
  | { readonly ok: false; readonly reason: string };

/** Apply a status transition immutably. Returns error if transition is not allowed. */
export function transitionCandidateReviewStatus<T extends { status: CandidateReviewStatus; updatedAt: string }>(
  input: TransitionCandidateReviewStatusInput<T>,
): TransitionCandidateReviewStatusResult<T> {
  const { candidate, nextStatus, context, updatedAt } = input;

  if (candidate.status === nextStatus) {
    return { ok: true, candidate: { ...candidate, updatedAt } };
  }

  if (!canTransitionCandidateReviewStatus(candidate.status, nextStatus, context)) {
    return {
      ok: false,
      reason: `Transition from ${candidate.status} to ${nextStatus} is not allowed.`,
    };
  }

  return {
    ok: true,
    candidate: {
      ...candidate,
      status: nextStatus,
      updatedAt,
    },
  };
}

export function buildTransitionContextFromCandidate(
  candidate: {
    readonly rejectionReasons: readonly string[];
    readonly reviewerNotes: readonly string[];
    readonly qa: { readonly findings: readonly { readonly severity: string; readonly blocksMasterApproval: boolean }[] };
    readonly lineage: { readonly supersededByCandidateId?: string };
  },
  approvalEligible: boolean,
): CandidateTransitionContext {
  const hasCriticalFindings = candidate.qa.findings.some(
    (finding) => finding.severity === "critical" || finding.blocksMasterApproval,
  );

  return {
    approvalEligible,
    hasRejectionReasons: candidate.rejectionReasons.length > 0,
    hasCriticalFindings,
    hasReviewerNotes: candidate.reviewerNotes.length > 0,
    hasLineageSupersededBy: Boolean(candidate.lineage.supersededByCandidateId?.trim()),
  };
}
