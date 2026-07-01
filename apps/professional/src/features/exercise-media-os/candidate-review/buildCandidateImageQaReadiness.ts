import { buildCandidateQaScore } from "./buildCandidateQaScore";
import type { CandidateImageQaWorksheet } from "./buildCandidateImageQaWorksheet";
import type { ExerciseMediaCandidate } from "./types";

export type CandidateImageQaReadinessLabel =
  | "missing"
  | "needs-human-review"
  | "dev-test"
  | "needs-revision"
  | "rejected"
  | "eligible-for-master-review";

export type CandidateImageQaReadiness = {
  readonly candidateId: string;
  readonly exerciseId: string;
  readonly readinessLabel: CandidateImageQaReadinessLabel;
  readonly approvalEligible: boolean;
  readonly blockedReasons: readonly string[];
  readonly warnings: readonly string[];
};

export type BuildCandidateImageQaReadinessInput = {
  readonly candidate: ExerciseMediaCandidate | null;
  readonly worksheet: CandidateImageQaWorksheet | null;
};

/** Summarize image candidate readiness for human review without approving it. */
export function buildCandidateImageQaReadiness(
  input: BuildCandidateImageQaReadinessInput,
): CandidateImageQaReadiness {
  const warnings: string[] = [
    "Readiness label is a QA planning signal — not CandidateReviewStatus approved-master.",
  ];
  const blockedReasons: string[] = [];

  if (!input.candidate) {
    return {
      candidateId: "missing",
      exerciseId: "missing",
      readinessLabel: "missing",
      approvalEligible: false,
      blockedReasons: ["No candidate exists for this keyframe."],
      warnings,
    };
  }

  const { candidate, worksheet } = input;

  if (candidate.status === "rejected") {
    return {
      candidateId: candidate.candidateId,
      exerciseId: candidate.exerciseId,
      readinessLabel: "rejected",
      approvalEligible: false,
      blockedReasons: ["Candidate status is rejected."],
      warnings,
    };
  }

  if (candidate.status === "needs-revision") {
    return {
      candidateId: candidate.candidateId,
      exerciseId: candidate.exerciseId,
      readinessLabel: "needs-revision",
      approvalEligible: false,
      blockedReasons: ["Candidate status is needs-revision."],
      warnings,
    };
  }

  const qaScore = buildCandidateQaScore({
    qa: candidate.qa,
    rights: candidate.rights,
    status: candidate.status,
  });

  if (candidate.rights.usageStatus === "internal-dev-only") {
    blockedReasons.push("Rights are internal-dev-only — not eligible for master review.");
  }

  if (candidate.rights.containsWatermark) {
    blockedReasons.push("Watermark flagged — blocks master eligibility.");
  }

  if (candidate.rights.containsLogosOrReadableText) {
    blockedReasons.push("Logos/readable text flagged — blocks master eligibility.");
  }

  if (!worksheet || worksheet.reviewStatus === "not-reviewed") {
    blockedReasons.push("QA worksheet is not-reviewed — human visual QA required.");
  }

  if (!qaScore.approvalEligible) {
    blockedReasons.push("M10 QA score is not approval eligible.");
  }

  const hasCriticalFinding = candidate.qa.findings.some(
    (finding) => finding.severity === "critical" && finding.blocksMasterApproval,
  );
  if (hasCriticalFinding) {
    blockedReasons.push("Critical QA findings block master eligibility.");
  }

  let readinessLabel: CandidateImageQaReadinessLabel = "needs-human-review";

  if (candidate.status === "dev-test") {
    readinessLabel = blockedReasons.length > 0 ? "dev-test" : "needs-human-review";
  }

  if (candidate.status === "draft") {
    readinessLabel = "needs-human-review";
  }

  const approvalEligible =
    blockedReasons.length === 0 &&
    qaScore.approvalEligible &&
    worksheet?.reviewStatus !== "not-reviewed";

  if (approvalEligible) {
    readinessLabel = "eligible-for-master-review";
    warnings.push("eligible-for-master-review is a recommendation only — not approved-master.");
  }

  return {
    candidateId: candidate.candidateId,
    exerciseId: candidate.exerciseId,
    readinessLabel,
    approvalEligible,
    blockedReasons,
    warnings,
  };
}
