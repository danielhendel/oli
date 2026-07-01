import { buildBenchPressImagePack } from "../buildBenchPressImagePack";
import { buildBenchPressImageSequencePlaybackPlan } from "../buildBenchPressImageSequencePlaybackPlan";
import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";

describe("ImagePackReadinessPanel helpers", () => {
  it("live bench press pack is not approved-master", () => {
    const pack = buildBenchPressImagePack();
    expect(pack.status).not.toBe("approved-master");
    expect(pack.missingPoseIds.length).toBe(4);
  });

  it("image sequence plan reports missing placeholders for live pack", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const plan = buildBenchPressImageSequencePlaybackPlan({
      imagePack: buildBenchPressImagePack(),
      keyframeSpec,
    });

    expect(plan.status).toBe("missing");
    expect(plan.frames.every((frame) => frame.status === "missing")).toBe(true);
  });

  it("dev-test warning is present in live pack warnings", () => {
    const pack = buildBenchPressImagePack();
    expect(pack.warnings.some((warning) => warning.includes("Video candidates"))).toBe(true);
  });
});
