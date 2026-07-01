import { buildExerciseKeyframeSpecFromEnrichment } from "../buildExerciseKeyframeSpecFromEnrichment";
import { validateExerciseKeyframeSpec } from "../validateExerciseKeyframeSpec";

describe("buildExerciseKeyframeSpecFromEnrichment", () => {
  it("builds a spec from enriched exercise profile", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec).not.toBeNull();
    expect(validateExerciseKeyframeSpec(spec!).valid).toBe(true);
  });

  it("preserves canonical exerciseId", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("deadlift");
    expect(spec?.exerciseId).toBe("deadlift");
    expect(spec?.keyframeSetId).toBe("keyframe-set-v1-deadlift");
  });

  it("uses preferred characterId when valid", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.characterId).toMatch(/^oli_motion_/);
  });

  it("includes required poses from enrichment", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.requiredPoses.length).toBeGreaterThanOrEqual(4);
    const poseIds = spec?.requiredPoses.map((pose) => pose.poseId) ?? [];
    expect(poseIds).toContain("setup");
    expect(poseIds).toContain("finish");
  });

  it("includes required views from enrichment", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.requiredViews.length).toBeGreaterThan(0);
    expect(spec?.requiredViews).toContain("front_45_right");
  });

  it("includes 16:9, 9:16, and 1:1 render targets when enrichment provides them", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.renderTargets).toContain("16:9");
    expect(spec?.renderTargets).toContain("9:16");
    expect(spec?.renderTargets).toContain("1:1");
  });

  it("includes pose acceptance criteria", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("deadlift");
    for (const pose of spec?.requiredPoses ?? []) {
      expect(pose.acceptanceCriteria.length).toBeGreaterThan(0);
    }
  });

  it("includes pose negative criteria", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("deadlift");
    for (const pose of spec?.requiredPoses ?? []) {
      expect(pose.negativeCriteria.length).toBeGreaterThan(0);
    }
  });

  it("includes common generation failures", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.commonGenerationFailures.length).toBeGreaterThan(0);
  });

  it("includes QA focus", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.qaFocus.length).toBeGreaterThan(0);
  });

  it("does not create candidates", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    const serialized = JSON.stringify(spec);
    expect(serialized).not.toMatch(/candidateId/i);
  });

  it("does not create image packs", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    const serialized = JSON.stringify(spec);
    expect(serialized).not.toMatch(/imagePackId/i);
  });

  it("does not mark media approved", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("squat");
    expect(spec?.reviewStatus).not.toBe("expert-reviewed");
    const serialized = JSON.stringify(spec);
    expect(serialized).not.toMatch(/approved-master/i);
    expect(spec?.futureVideoNotes.some((note) => note.includes("approved master keyframes"))).toBe(
      true,
    );
  });

  it("returns null when enrichment is missing", () => {
    const { spec } = buildExerciseKeyframeSpecFromEnrichment("pause_squat");
    expect(spec).toBeNull();
  });
});
