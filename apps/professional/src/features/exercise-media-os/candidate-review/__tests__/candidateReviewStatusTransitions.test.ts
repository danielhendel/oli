import {
  buildTransitionContextFromCandidate,
  canTransitionCandidateReviewStatus,
  getAllowedCandidateReviewTransitions,
  transitionCandidateReviewStatus,
} from "../candidateReviewStatusTransitions";
import type { ExerciseMediaCandidate } from "../types";
import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../data/benchPressMediaCandidates";
import { isCandidateApprovalEligible } from "../buildCandidateQaScore";

const TRANSITION_TIMESTAMP = "2026-06-30T12:00:00.000Z";

describe("candidateReviewStatusTransitions", () => {
  it("missing cannot go directly to approved-master", () => {
    expect(getAllowedCandidateReviewTransitions("missing")).not.toContain("approved-master");
    expect(
      canTransitionCandidateReviewStatus("missing", "approved-master", {
        approvalEligible: true,
        hasRejectionReasons: false,
        hasCriticalFindings: false,
        hasReviewerNotes: false,
        hasLineageSupersededBy: false,
      }),
    ).toBe(false);
  });

  it("draft can go to dev-test", () => {
    expect(getAllowedCandidateReviewTransitions("draft")).toContain("dev-test");
  });

  it("dev-test can go to needs-revision", () => {
    expect(getAllowedCandidateReviewTransitions("dev-test")).toContain("needs-revision");
  });

  it("rejected can go to superseded", () => {
    expect(getAllowedCandidateReviewTransitions("rejected")).toContain("superseded");
  });

  it("approved-master can go to superseded", () => {
    expect(getAllowedCandidateReviewTransitions("approved-master")).toContain("superseded");
  });

  it("superseded is terminal", () => {
    expect(getAllowedCandidateReviewTransitions("superseded")).toEqual([]);
  });

  it("approved-master requires approval eligibility", () => {
    expect(
      canTransitionCandidateReviewStatus("draft", "approved-master", {
        approvalEligible: false,
        hasRejectionReasons: false,
        hasCriticalFindings: false,
        hasReviewerNotes: false,
        hasLineageSupersededBy: false,
      }),
    ).toBe(false);
  });

  it("rejected requires rejection reasons or critical findings", () => {
    expect(
      canTransitionCandidateReviewStatus("draft", "rejected", {
        approvalEligible: false,
        hasRejectionReasons: false,
        hasCriticalFindings: false,
        hasReviewerNotes: false,
        hasLineageSupersededBy: false,
      }),
    ).toBe(false);
  });

  it("transition does not mutate input candidate", () => {
    const candidate: ExerciseMediaCandidate = {
      ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE,
      status: "draft",
    };
    const frozen = JSON.stringify(candidate);

    const context = buildTransitionContextFromCandidate(
      candidate,
      isCandidateApprovalEligible({ qa: candidate.qa, rights: candidate.rights }),
    );

    transitionCandidateReviewStatus({
      candidate,
      nextStatus: "dev-test",
      context,
      updatedAt: TRANSITION_TIMESTAMP,
    });

    expect(JSON.stringify(candidate)).toBe(frozen);
  });

  it("returns updated copy on successful transition", () => {
    const candidate: ExerciseMediaCandidate = {
      ...BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE,
      status: "draft",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    const result = transitionCandidateReviewStatus({
      candidate,
      nextStatus: "dev-test",
      context: buildTransitionContextFromCandidate(candidate, false),
      updatedAt: TRANSITION_TIMESTAMP,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.status).toBe("dev-test");
      expect(result.candidate.updatedAt).toBe(TRANSITION_TIMESTAMP);
      expect(candidate.status).toBe("draft");
    }
  });
});
