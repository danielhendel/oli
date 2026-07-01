import {
  BENCH_PRESS_HERO_DEMO_NEGATIVE_CRITERIA,
} from "../../bench-press-product/benchPressHeroDemoQaStandard";
import { buildBenchPressKeyframeSpec } from "../buildBenchPressKeyframeSpec";
import {
  BENCH_PRESS_REQUIRED_RENDER_TARGETS,
  type ExerciseKeyframePoseId,
  type ExerciseKeyframeSpec,
} from "../types";
import {
  specIncludesRenderTarget,
  specIncludesView,
  validateExerciseKeyframeSpec,
} from "../validateExerciseKeyframeSpec";

describe("buildBenchPressKeyframeSpec", () => {
  const spec = buildBenchPressKeyframeSpec();

  it("uses canonical exerciseId bench_press", () => {
    expect(spec.exerciseId).toBe("bench_press");
  });

  it("anchors to oli_motion_male_m1", () => {
    expect(spec.characterId).toBe("oli_motion_male_m1");
  });

  it.each<ExerciseKeyframePoseId>([
    "setup",
    "start_lockout",
    "bottom_chest_pause",
    "finish_lockout",
  ])("includes required pose %s", (poseId) => {
    expect(spec.requiredPoses.some((pose) => pose.poseId === poseId)).toBe(true);
  });

  it("includes render targets 16:9, 9:16, and 1:1", () => {
    for (const target of BENCH_PRESS_REQUIRED_RENDER_TARGETS) {
      expect(specIncludesRenderTarget(spec, target)).toBe(true);
    }
    expect(spec.renderTargets).toEqual(["16:9", "9:16", "1:1"]);
  });

  it("includes front_45_right as a required master view", () => {
    expect(specIncludesView(spec, "front_45_right")).toBe(true);
  });

  it("includes acceptance criteria for chest touch and sternum pause", () => {
    const bottomPose = spec.requiredPoses.find((pose) => pose.poseId === "bottom_chest_pause");
    const acceptanceHaystack = [
      ...spec.acceptanceCriteria,
      ...(bottomPose?.acceptanceCriteria ?? []),
    ]
      .join(" ")
      .toLowerCase();

    expect(acceptanceHaystack).toMatch(/chest|sternum/);
    expect(acceptanceHaystack).toMatch(/pause/);
    expect(acceptanceHaystack).toMatch(/wrist/);
    expect(acceptanceHaystack).toMatch(/feet planted/);
    expect(acceptanceHaystack).toMatch(/stable camera/);
    expect(acceptanceHaystack).toMatch(/realistic/);
    expect(acceptanceHaystack).toMatch(/watermark/);
  });

  it("includes negative criteria for common AI and video failures", () => {
    const negativeHaystack = [
      ...spec.negativeCriteria,
      ...BENCH_PRESS_HERO_DEMO_NEGATIVE_CRITERIA,
    ]
      .join(" ")
      .toLowerCase();

    expect(negativeHaystack).toMatch(/second rep/);
    expect(negativeHaystack).toMatch(/half rep/);
    expect(negativeHaystack).toMatch(/warped/);
    expect(negativeHaystack).toMatch(/distorted hands/);
    expect(negativeHaystack).toMatch(/impossible anatomy/);
    expect(negativeHaystack).toMatch(/watermark/);
    expect(negativeHaystack).toMatch(/logo/);
    expect(negativeHaystack).toMatch(/readable text/);
  });

  it("validation returns no errors", () => {
    const result = validateExerciseKeyframeSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe("validateExerciseKeyframeSpec", () => {
  it("rejects unknown character ids", () => {
    const spec = buildBenchPressKeyframeSpec();
    const invalid = {
      ...spec,
      characterId: "unknown_character",
    } as unknown as ExerciseKeyframeSpec;
    const result = validateExerciseKeyframeSpec(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unknown-character-id")).toBe(true);
  });
});
