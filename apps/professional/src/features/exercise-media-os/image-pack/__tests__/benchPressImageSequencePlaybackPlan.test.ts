import { buildApprovedMasterImagePack } from "../buildApprovedMasterImagePack";
import { buildBenchPressImagePack } from "../buildBenchPressImagePack";
import { buildBenchPressImageSequencePlaybackPlan } from "../buildBenchPressImageSequencePlaybackPlan";
import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";
import { APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES } from "../fixtures/approvedBenchPressImageCandidates";

function buildFixtureApprovedPack() {
  const keyframeSpec = buildBenchPressKeyframeSpec();
  return buildApprovedMasterImagePack({
    imagePackId: "fixture-playback-pack",
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
}

describe("buildBenchPressImageSequencePlaybackPlan", () => {
  it("approved fixture pack produces four playback frames in order", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildFixtureApprovedPack();
    const plan = buildBenchPressImageSequencePlaybackPlan({ imagePack: pack, keyframeSpec });

    expect(plan.frames).toHaveLength(4);
    expect(plan.frames.map((frame) => frame.poseId)).toEqual([
      "setup",
      "start_lockout",
      "bottom_chest_pause",
      "finish_lockout",
    ]);
    expect(plan.status).toBe("available");
  });

  it("missing live pack produces missing placeholders", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildBenchPressImagePack();
    const plan = buildBenchPressImageSequencePlaybackPlan({ imagePack: pack, keyframeSpec });

    expect(plan.status).toBe("missing");
    expect(plan.frames).toHaveLength(4);
    expect(plan.frames.every((frame) => frame.status === "missing")).toBe(true);
    expect(plan.frames.every((frame) => frame.publicPath === undefined)).toBe(true);
  });

  it("frame captions match keyframe purpose", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildFixtureApprovedPack();
    const plan = buildBenchPressImageSequencePlaybackPlan({ imagePack: pack, keyframeSpec });

    const setupFrame = plan.frames.find((frame) => frame.poseId === "setup");
    expect(setupFrame?.title).toBe(keyframeSpec.requiredPoses[0]?.label);
    expect(setupFrame?.coachingCaption.length).toBeGreaterThan(0);
  });

  it("alt text is present on every frame", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildFixtureApprovedPack();
    const plan = buildBenchPressImageSequencePlaybackPlan({ imagePack: pack, keyframeSpec });

    expect(plan.frames.every((frame) => frame.altText.trim().length > 0)).toBe(true);
  });

  it("status is incomplete/missing when image files are not available live", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const livePlan = buildBenchPressImageSequencePlaybackPlan({
      imagePack: buildBenchPressImagePack(),
      keyframeSpec,
    });
    expect(["missing", "incomplete"]).toContain(livePlan.status);
  });

  it("does not require video for image sequence playback", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const plan = buildBenchPressImageSequencePlaybackPlan({
      imagePack: buildBenchPressImagePack(),
      keyframeSpec,
    });
    expect(plan.frames.length).toBe(4);
    expect(plan.frames.every((frame) => frame.altText.trim().length > 0)).toBe(true);
    expect(plan.status).toBe("missing");
  });
});
