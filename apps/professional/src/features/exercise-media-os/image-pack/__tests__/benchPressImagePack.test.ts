import { buildApprovedMasterImagePack } from "../buildApprovedMasterImagePack";
import { buildBenchPressImagePack } from "../buildBenchPressImagePack";
import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";
import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../../candidate-review/data/benchPressMediaCandidates";
import { APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES } from "../fixtures/approvedBenchPressImageCandidates";
import { DEV_TEST_SETUP_IMAGE_FIXTURE } from "../fixtures/incompleteBenchPressImageCandidates";

describe("buildBenchPressImagePack", () => {
  it("default live pack is not approved-master when no live image candidates exist", () => {
    const pack = buildBenchPressImagePack();
    expect(pack.status).not.toBe("approved-master");
    expect(pack.exerciseId).toBe("bench_press");
    expect(pack.characterId).toBe("oli_motion_male_m1");
    expect(pack.thumbnailFrameId).toBeUndefined();
  });

  it("reports missing keyframes for live pack", () => {
    const pack = buildBenchPressImagePack();
    expect(pack.missingPoseIds).toEqual([
      "setup",
      "start_lockout",
      "bottom_chest_pause",
      "finish_lockout",
    ]);
    expect(pack.frames).toHaveLength(0);
  });

  it("fixture pack can become approved-master", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildApprovedMasterImagePack({
      imagePackId: "fixture-pack",
      exerciseId: keyframeSpec.exerciseId,
      packageVersion: "fixture-v1",
      keyframeSpec: {
        exerciseId: keyframeSpec.exerciseId,
        keyframeSetId: keyframeSpec.keyframeSetId,
        keyframeVersion: keyframeSpec.keyframeVersion,
        characterId: keyframeSpec.characterId,
        requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
          poseId: pose.poseId,
          label: pose.label,
          purpose: pose.purpose,
        })),
      },
      candidates: APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES,
      requiredRenderTargets: ["16:9"],
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
      requireFilesInRepo: true,
    });

    expect(pack.status).toBe("approved-master");
    expect(pack.approvedPoseIds).toHaveLength(4);
  });

  it("dev-test images do not count toward approved-master", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildApprovedMasterImagePack({
      imagePackId: "dev-test-pack",
      exerciseId: keyframeSpec.exerciseId,
      packageVersion: "fixture-v1",
      keyframeSpec: {
        exerciseId: keyframeSpec.exerciseId,
        keyframeSetId: keyframeSpec.keyframeSetId,
        keyframeVersion: keyframeSpec.keyframeVersion,
        characterId: keyframeSpec.characterId,
        requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
          poseId: pose.poseId,
          label: pose.label,
          purpose: pose.purpose,
        })),
      },
      candidates: [
        DEV_TEST_SETUP_IMAGE_FIXTURE,
        ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES.slice(1),
      ],
      requiredRenderTargets: ["16:9"],
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
      requireFilesInRepo: true,
    });

    expect(pack.status).not.toBe("approved-master");
    expect(pack.missingPoseIds).toContain("setup");
  });

  it("video dev-test hero demo does not count toward image pack", () => {
    const pack = buildBenchPressImagePack();
    expect(
      pack.frames.every(
        (frame) => frame.candidateId !== BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.candidateId,
      ),
    ).toBe(true);
    expect(pack.warnings.some((warning) => warning.includes("Video candidates"))).toBe(true);
  });

  it("next action points to generating setup keyframe first when pack is missing", () => {
    const pack = buildBenchPressImagePack();
    expect(pack.missingPoseIds[0]).toBe("setup");
    expect(pack.warnings.some((warning) => warning.includes("setup"))).toBe(true);
  });
});
