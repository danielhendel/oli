import { EXERCISE_LIBRARY_V1 } from "@oli/lib/workouts/exercises/library.v1";
import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { buildBenchPressKeyframeSpec } from "../buildBenchPressKeyframeSpec";
import {
  buildTop25ExerciseKeyframeSpecRegistry,
  getTop25ExerciseKeyframeSpecByExerciseId,
  hasTop25ExerciseKeyframeSpec,
  isBenchPressAuthoritativeKeyframeSpec,
  listTop25ExerciseKeyframeSpecs,
} from "../buildTop25ExerciseKeyframeSpecRegistry";
import { TOP25_EXERCISE_KEYFRAME_SPECS } from "../data/top25ExerciseKeyframeSpecs";
import { validateTop25ExerciseKeyframeSpecRegistry } from "../validateTop25ExerciseKeyframeSpecRegistry";

describe("Top 25 Exercise Keyframe Spec Registry", () => {
  const registry = buildTop25ExerciseKeyframeSpecRegistry();

  it("contains exactly 25 specs", () => {
    expect(registry).toHaveLength(25);
    expect(TOP25_EXERCISE_KEYFRAME_SPECS).toHaveLength(25);
    expect(listTop25ExerciseKeyframeSpecs()).toHaveLength(25);
  });

  it("every TOP25_EXERCISE_ENRICHMENT_ID has a spec", () => {
    for (const exerciseId of TOP25_EXERCISE_ENRICHMENT_IDS) {
      expect(hasTop25ExerciseKeyframeSpec(exerciseId)).toBe(true);
      expect(getTop25ExerciseKeyframeSpecByExerciseId(exerciseId)).not.toBeNull();
    }
  });

  it("every spec exerciseId exists in EXERCISE_LIBRARY_V1", () => {
    const libraryIds = new Set(EXERCISE_LIBRARY_V1.map((row) => row.exerciseId));
    for (const spec of registry) {
      expect(libraryIds.has(spec.exerciseId)).toBe(true);
    }
  });

  it("has no duplicate exerciseIds", () => {
    const ids = registry.map((spec) => spec.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("bench_press uses or matches buildBenchPressKeyframeSpec", () => {
    const registrySpec = getTop25ExerciseKeyframeSpecByExerciseId("bench_press");
    const m9Spec = buildBenchPressKeyframeSpec();
    expect(registrySpec).toEqual(m9Spec);
    expect(isBenchPressAuthoritativeKeyframeSpec(registrySpec!)).toBe(true);
  });

  it("bench_press includes M9 poses", () => {
    const spec = getTop25ExerciseKeyframeSpecByExerciseId("bench_press")!;
    const poseIds = spec.requiredPoses.map((pose) => pose.poseId);
    expect(poseIds).toEqual(
      expect.arrayContaining(["setup", "start_lockout", "bottom_chest_pause", "finish_lockout"]),
    );
  });

  it("every spec has a valid characterId", () => {
    for (const spec of registry) {
      expect(spec.characterId).toMatch(/^oli_motion_/);
    }
  });

  it("every spec includes 16:9", () => {
    for (const spec of registry) {
      expect(spec.renderTargets).toContain("16:9");
    }
  });

  it("every spec includes at least one required view", () => {
    for (const spec of registry) {
      expect(spec.requiredViews.length).toBeGreaterThan(0);
    }
  });

  it("every spec includes at least three required poses", () => {
    for (const spec of registry) {
      expect(spec.requiredPoses.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("validation returns no error severity issues", () => {
    const result = validateTop25ExerciseKeyframeSpecRegistry(registry);
    const errors = result.issues.filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
});
