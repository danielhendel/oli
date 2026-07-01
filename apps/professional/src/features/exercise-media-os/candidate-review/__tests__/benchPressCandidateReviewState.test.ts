import { buildBenchPressCandidateReviewState } from "../buildBenchPressCandidateReviewState";
import {
  BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE,
  isBenchPressHeroDemoDevTestCandidate,
} from "../data/benchPressMediaCandidates";
import { BENCH_PRESS_REQUIRED_POSE_IDS } from "../../keyframe-spec/types";

describe("buildBenchPressCandidateReviewState", () => {
  const state = buildBenchPressCandidateReviewState();

  it("preserves canonical exerciseId bench_press", () => {
    expect(state.exerciseId).toBe("bench_press");
  });

  it("uses oli_motion_male_m1 character from keyframe spec", () => {
    expect(state.characterId).toBe("oli_motion_male_m1");
  });

  it("includes hero demo dev-test candidate", () => {
    expect(state.devTestCandidates.length).toBeGreaterThanOrEqual(1);
    expect(
      state.devTestCandidates.some((candidate) =>
        isBenchPressHeroDemoDevTestCandidate(candidate.candidateId),
      ),
    ).toBe(true);
  });

  it("hero demo dev-test candidate is not approved-master", () => {
    expect(BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.status).toBe("dev-test");
    expect(state.approvedMasterCandidates).toHaveLength(0);
    expect(state.statusCounts["approved-master"]).toBe(0);
  });

  it.each(BENCH_PRESS_REQUIRED_POSE_IDS)(
    "marks %s keyframe requirement as missing by default",
    (poseId) => {
      expect(
        state.missingKeyframeRequirements.some((requirement) => requirement.poseId === poseId),
      ).toBe(true);
    },
  );

  it("image pack readiness is not approved-master-ready", () => {
    expect(state.imagePackReadiness).not.toBe("approved-master-ready");
    expect(state.imagePackReadiness).toBe("missing");
  });

  it("next recommended action points toward keyframe generation", () => {
    expect(state.nextRecommendedAction.actionId).toBe("generate-keyframe-candidate");
    expect(state.nextRecommendedAction.poseId).toBe("setup");
  });

  it("approved slot metadata alone does not create approved-master candidates", () => {
    expect(state.slotMetadataDoesNotEqualApprovedCandidate).toBe(true);
    expect(state.approvedMasterCandidates).toHaveLength(0);
    expect(state.warnings.some((warning) => warning.includes("slot metadata"))).toBe(true);
  });

  it("missing playable asset does not equal approved-master candidate", () => {
    expect(state.missingPlayableAssetDoesNotEqualApprovedCandidate).toBe(true);
    expect(state.warnings.some((warning) => warning.includes("playable asset"))).toBe(true);
  });

  it("dev-test is distinct from approved-master in warnings", () => {
    expect(state.warnings.some((warning) => warning.toLowerCase().includes("dev-test"))).toBe(true);
  });
});
