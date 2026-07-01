import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../../candidate-review/data/benchPressMediaCandidates";
import { buildBenchPressImportedCandidateReviewState } from "../buildBenchPressImportedCandidateReviewState";
import { buildBenchPressImportedImageCandidates } from "../buildBenchPressImportedImageCandidates";
import { buildBenchPressKeyframeImportManifest } from "../buildBenchPressKeyframeImportManifest";

describe("buildBenchPressImportedCandidateReviewState", () => {
  const live = buildBenchPressImportedCandidateReviewState();

  it("no images => all 4 keyframes missing", () => {
    expect(live.importSummary.importableItemCount).toBe(0);
    expect(live.importSummary.importedCandidateCount).toBe(0);
    expect(live.candidateReviewState.missingKeyframeRequirements).toHaveLength(4);
  });

  it("setup image imported => setup no longer missing", () => {
    const manifest = buildBenchPressKeyframeImportManifest({
      filePresenceMap: { "/media/exercises/bench_press/keyframes/setup-16x9.png": true },
    });
    const imported = buildBenchPressImportedImageCandidates(manifest).candidates;
    const state = buildBenchPressImportedCandidateReviewState({
      importManifest: manifest,
      importedCandidates: imported,
      includeExistingBenchPressCandidates: false,
    });
    const missingPoseIds = state.candidateReviewState.missingKeyframeRequirements.map(
      (req) => req.poseId,
    );
    expect(missingPoseIds).not.toContain("setup");
    expect(missingPoseIds).toHaveLength(3);
  });

  it("4 dev-test images imported => image pack is not approved-master-ready", () => {
    const manifest = buildBenchPressKeyframeImportManifest({
      filePresenceMap: {
        "/media/exercises/bench_press/keyframes/setup-16x9.png": true,
        "/media/exercises/bench_press/keyframes/start-lockout-16x9.png": true,
        "/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png": true,
        "/media/exercises/bench_press/keyframes/finish-lockout-16x9.png": true,
      },
    });
    const imported = buildBenchPressImportedImageCandidates(manifest).candidates;
    const state = buildBenchPressImportedCandidateReviewState({
      importManifest: manifest,
      importedCandidates: imported,
      includeExistingBenchPressCandidates: false,
    });
    expect(state.candidateReviewState.imagePackReadiness).not.toBe("approved-master-ready");
    expect(state.candidateReviewState.approvedMasterCandidates).toHaveLength(0);
  });

  it("existing hero demo candidate remains dev-test when included", () => {
    const state = buildBenchPressImportedCandidateReviewState({
      includeExistingBenchPressCandidates: true,
    });
    expect(
      state.candidateReviewState.devTestCandidates.some(
        (candidate) => candidate.candidateId === BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.candidateId,
      ),
    ).toBe(true);
  });

  it("warnings state imported candidates require human QA", () => {
    expect(live.warnings.some((warning) => warning.includes("require human QA"))).toBe(true);
    expect(live.warnings.some((warning) => warning.includes("not approved-master"))).toBe(true);
    expect(live.warnings.some((warning) => warning.includes("Image pack approval"))).toBe(true);
  });

  it("does not create image pack approval", () => {
    expect(live.candidateReviewState.imagePackReadiness).not.toBe("approved-master-ready");
  });
});
