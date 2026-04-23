import type { CustomExerciseRecord } from "../customExerciseStore";
import {
  resolveExerciseIntelligenceForAnalytics,
  type ExerciseAnalyticsResolutionContext,
} from "../exerciseAnalyticsIntelligence";

function customRecord(
  partial: Partial<CustomExerciseRecord> & Pick<CustomExerciseRecord, "exerciseId" | "name">,
): CustomExerciseRecord {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    equipment: "Dumbbell",
    primary: "Biceps",
    loggingType: "weight_reps",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("resolveExerciseIntelligenceForAnalytics", () => {
  it("bench_press uses chest classification, contributions, and classification source", () => {
    const r = resolveExerciseIntelligenceForAnalytics("bench_press");
    expect(r.exerciseId).toBe("bench_press");
    expect(r.resolutionExerciseId).toBe("bench_press");
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.classification?.categoryKey).toBe("chest");
    expect(r.hasContributionMap).toBe(true);
    expect(r.contributions?.length).toBeGreaterThan(0);
    expect(r.classificationSource).toBe("classification");
    expect(r.movementPattern).toBeTruthy();
  });

  it("dumbbell_fly has classification but no contribution map; primary is still chest", () => {
    const r = resolveExerciseIntelligenceForAnalytics("dumbbell_fly");
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.classification?.categoryKey).toBe("chest");
    expect(r.hasContributionMap).toBe(false);
    expect(r.contributions).toBeNull();
    expect(r.classificationSource).toBe("classification");
  });

  it("squat resolves to quads slice", () => {
    const r = resolveExerciseIntelligenceForAnalytics("squat");
    expect(r.primaryMuscleGroup).toBe("quads");
    expect(r.classification?.categoryKey).toBe("quads");
    expect(r.hasContributionMap).toBe(true);
    expect(r.classificationSource).toBe("classification");
  });

  it("romanian_deadlift disambiguates back vs hamstrings using contribution lead group", () => {
    const r = resolveExerciseIntelligenceForAnalytics("romanian_deadlift");
    expect(r.classification?.categoryKey).toBe("hamstrings");
    expect(r.primaryMuscleGroup).toBe("hamstrings");
    expect(r.classificationSource).toBe("classification");
  });

  it("hip_thrust resolves to glutes slice", () => {
    const r = resolveExerciseIntelligenceForAnalytics("hip_thrust");
    expect(r.primaryMuscleGroup).toBe("glutes");
    expect(r.classification?.categoryKey).toBe("glutes");
    expect(r.classificationSource).toBe("classification");
  });

  it("leg_press resolves to quads slice", () => {
    const r = resolveExerciseIntelligenceForAnalytics("leg_press");
    expect(r.primaryMuscleGroup).toBe("quads");
    expect(r.classificationSource).toBe("classification");
  });

  it("full-body power_clean falls back to primaryCoarse[0] → back", () => {
    const r = resolveExerciseIntelligenceForAnalytics("power_clean");
    expect(r.classification).toBeNull();
    expect(r.hasContributionMap).toBe(false);
    expect(r.primaryMuscleGroup).toBe("back");
    expect(r.classificationSource).toBe("library");
  });

  it("unknown id is safe", () => {
    const r = resolveExerciseIntelligenceForAnalytics("totally_unknown_exercise_xyz");
    expect(r.primaryMuscleGroup).toBeNull();
    expect(r.classification).toBeNull();
    expect(r.classificationSource).toBe("unknown");
    expect(r.contributions).toBeNull();
  });

  it("empty exerciseId is safe", () => {
    const r = resolveExerciseIntelligenceForAnalytics("   ");
    expect(r.classificationSource).toBe("unknown");
    expect(r.primaryMuscleGroup).toBeNull();
  });

  it("custom exercise aliased by name to bench_press inherits catalog intelligence", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map([
        [
          "custom_u1_bench",
          customRecord({
            exerciseId: "custom_u1_bench",
            name: "Bench Press",
            primary: "Chest",
          }),
        ],
      ]),
    };
    const r = resolveExerciseIntelligenceForAnalytics("custom_u1_bench", ctx);
    expect(r.exerciseId).toBe("custom_u1_bench");
    expect(r.resolutionExerciseId).toBe("bench_press");
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.hasContributionMap).toBe(true);
    expect(r.classificationSource).toBe("classification");
  });

  it("custom exercise without catalog alias uses custom primary resolution", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map([
        [
          "custom_u1_weird",
          customRecord({
            exerciseId: "custom_u1_weird",
            name: "Zebra Curl Ultra",
            primary: "Biceps",
          }),
        ],
      ]),
    };
    const r = resolveExerciseIntelligenceForAnalytics("custom_u1_weird", ctx);
    expect(r.resolutionExerciseId).toBe("custom_u1_weird");
    expect(r.primaryMuscleGroup).toBe("biceps");
    expect(r.classificationSource).toBe("custom");
  });

  it("legacy customPrimaryMuscleGroupByExerciseId works without custom row", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customPrimaryMuscleGroupByExerciseId: new Map([["custom_u1_only_map", "calves"]]),
    };
    const r = resolveExerciseIntelligenceForAnalytics("custom_u1_only_map", ctx);
    expect(r.primaryMuscleGroup).toBe("calves");
    expect(r.classificationSource).toBe("custom");
  });

  it("uses fallback display name when exercise id is synthetic but name matches catalog", () => {
    const r = resolveExerciseIntelligenceForAnalytics("exercise:ingested:test", undefined, {
      fallbackLoggedExerciseName: "Bench Press",
    });
    expect(r.exerciseId).toBe("exercise:ingested:test");
    expect(r.resolutionExerciseId).toBe("bench_press");
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.classificationSource).toBe("classification");
  });

  it("resolves legacy display names (aliases + normalization) on synthetic ids", () => {
    const r = resolveExerciseIntelligenceForAnalytics("exercise:ingested:raw1:0", undefined, {
      fallbackLoggedExerciseName: "Standing Barbell Shoulder Press",
    });
    expect(r.resolutionExerciseId).toBe("overhead_press");
    expect(r.primaryMuscleGroup).toBe("shoulders");
  });

  it("uses custom muscleContributions when present", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map([
        [
          "custom_u1_mc",
          customRecord({
            exerciseId: "custom_u1_mc",
            name: "Zebra move",
            primary: "Legs",
            muscleContributions: [
              { subgroup: "gastrocnemius", weight: 0.6 },
              { subgroup: "soleus", weight: 0.4 },
            ],
          }),
        ],
      ]),
    };
    const r = resolveExerciseIntelligenceForAnalytics("custom_u1_mc", ctx);
    expect(r.primaryMuscleGroup).toBe("calves");
    expect(r.hasContributionMap).toBe(true);
    expect(r.classificationSource).toBe("contribution");
  });
});
