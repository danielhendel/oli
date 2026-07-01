import { resolveCandidateReviewStateForExercise } from "../resolveCandidateReviewState";
import { buildBenchPressCandidateReviewState } from "../buildBenchPressCandidateReviewState";

describe("CandidateReviewPanel helpers", () => {
  it("returns bench press review state with dev-test candidate", () => {
    const state = resolveCandidateReviewStateForExercise("bench_press");
    expect(state?.exerciseId).toBe("bench_press");
    expect(state?.devTestCandidates.length).toBeGreaterThan(0);
    expect(state?.approvedMasterCandidates).toHaveLength(0);
  });

  it("returns empty review state for non-bench exercises", () => {
    const state = resolveCandidateReviewStateForExercise("squat");
    expect(state?.exerciseId).toBe("squat");
    expect(state?.totalCandidates).toBe(0);
    expect(state?.nextRecommendedAction.actionId).toBe("await-keyframe-spec");
  });

  it("buildBenchPressCandidateReviewState matches helper for bench_press", () => {
    expect(resolveCandidateReviewStateForExercise("bench_press")).toEqual(
      buildBenchPressCandidateReviewState(),
    );
  });
});
