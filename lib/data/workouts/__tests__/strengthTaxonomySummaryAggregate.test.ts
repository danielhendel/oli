import { describe, expect, it } from "@jest/globals";
import type { ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  createEmptyStrengthTaxonomyMaps,
  mergeManualExercisesIntoStrengthTaxonomyMaps,
  serializeStrengthTaxonomyMaps,
} from "@/lib/data/workouts/strengthTaxonomySummaryAggregate";

describe("strengthTaxonomySummaryAggregate", () => {
  function ex(partial: Partial<ManualWorkoutExerciseSummary> & Pick<ManualWorkoutExerciseSummary, "exerciseId" | "name">): ManualWorkoutExerciseSummary {
    return {
      sets: [{ setNumber: 1, reps: 10, weightKg: 100, intensity: null }],
      ...partial,
    };
  }

  it("uses exerciseId-first resolution for bundled ids", () => {
    const maps = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, [ex({ exerciseId: "bench_press", name: "Mislabeled title" })]);
    const s = serializeStrengthTaxonomyMaps(maps);
    expect(s).not.toBeNull();
    expect(s!.strengthTrainingVolumeKg).toBeGreaterThan(0);
    expect((s!.muscleVolumeKgByGroup.chest ?? 0) > 0 || (s!.muscleVolumeKgByGroup.quads ?? 0) > 0).toBe(true);
  });

  it("falls back to name-based catalog resolution when exerciseId is synthetic", () => {
    const maps = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, [
      ex({
        exerciseId: "exercise:ingested:raw1:0",
        name: "Bench Press",
      }),
    ]);
    const s = serializeStrengthTaxonomyMaps(maps);
    expect(s).not.toBeNull();
    expect(s!.strengthTrainingVolumeKg).toBeGreaterThan(0);
  });

  it("mixed ids in one merge matches sum of separate merges (deterministic)", () => {
    const a = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(a, [
      ex({ exerciseId: "squat", name: "Squat", sets: [{ setNumber: 1, reps: 5, weightKg: 100, intensity: null }] }),
    ]);
    const b = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(b, [
      ex({
        exerciseId: "exercise:x:0",
        name: "Bench Press",
        sets: [{ setNumber: 1, reps: 10, weightKg: 50, intensity: null }],
      }),
    ]);
    const combined = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(combined, [
      ex({ exerciseId: "squat", name: "Squat", sets: [{ setNumber: 1, reps: 5, weightKg: 100, intensity: null }] }),
      ex({
        exerciseId: "exercise:x:0",
        name: "Bench Press",
        sets: [{ setNumber: 1, reps: 10, weightKg: 50, intensity: null }],
      }),
    ]);
    expect(serializeStrengthTaxonomyMaps(combined)!.strengthTrainingVolumeKg).toBeCloseTo(
      (serializeStrengthTaxonomyMaps(a)!.strengthTrainingVolumeKg +
        serializeStrengthTaxonomyMaps(b)!.strengthTrainingVolumeKg) as number,
      6,
    );
  });
});
