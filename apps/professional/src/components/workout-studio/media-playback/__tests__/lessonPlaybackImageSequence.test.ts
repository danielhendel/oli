import { buildBenchPressImageSequencePlaybackPlan } from "../../../../features/exercise-media-os/image-pack/buildBenchPressImageSequencePlaybackPlan";
import { buildBenchPressImagePack } from "../../../../features/exercise-media-os/image-pack/buildBenchPressImagePack";
import { buildBenchPressKeyframeSpec } from "../../../../features/exercise-media-os/keyframe-spec/buildBenchPressKeyframeSpec";

describe("LessonPlaybackImageSequence helpers", () => {
  it("placeholder frames render without real image files", () => {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const plan = buildBenchPressImageSequencePlaybackPlan({
      imagePack: buildBenchPressImagePack(),
      keyframeSpec,
    });

    expect(plan.frames.length).toBe(4);
    expect(plan.frames.every((frame) => frame.publicPath === undefined)).toBe(true);
    expect(plan.frames.every((frame) => frame.altText.trim().length > 0)).toBe(true);
  });
});
