import {
  createEmptyStrengthTaxonomyMaps,
  mergeManualExercisesIntoStrengthTaxonomyMaps,
  serializeStrengthTaxonomyMaps,
} from "@/lib/data/workouts/strengthTaxonomySummaryAggregate";
import type { ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { mergeExerciseIntelligenceForId } from "../classificationResolvers";
import {
  resolveExerciseIntelligenceForAnalytics,
  type ExerciseAnalyticsResolutionContext,
} from "../exerciseAnalyticsIntelligence";
import {
  getExerciseIntelligenceV1,
  getSeededExerciseIntelligenceIds,
  validateExerciseIntelligenceRegistry,
} from "../intelligence/exerciseIntelligenceV1Registry";
import { HYPERTROPHY_CORE_INTELLIGENCE_V1 } from "../intelligence/hypertrophyCoreV1";
import { validateExerciseIntelligenceV1 } from "../intelligence/exerciseIntelligenceV1Types";

const MAJOR_REGION_KEYS = [
  "upperChest",
  "midChest",
  "lowerChest",
  "lats",
  "upperBack",
  "rearDelts",
  "sideDelts",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "forearms",
  "tibialis",
] as const;

describe("ExerciseIntelligenceV1 foundation", () => {
  it("hypertrophy core seed contains exactly 100 catalog exercises", () => {
    expect(HYPERTROPHY_CORE_INTELLIGENCE_V1).toHaveLength(100);
    expect(getSeededExerciseIntelligenceIds()).toHaveLength(100);
    const ids = getSeededExerciseIntelligenceIds();
    expect(new Set(ids).size).toBe(100);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("all 100 seeded exerciseIds resolve via getExerciseIntelligenceV1", () => {
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      const resolved = getExerciseIntelligenceV1(row.exerciseId);
      expect(resolved?.exerciseId).toBe(row.exerciseId);
    }
  });

  it("at least one exercise per major region has hypertrophyIntelligence stimulus", () => {
    const covered = new Set<string>();
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      for (const key of MAJOR_REGION_KEYS) {
        const v = row.stimulus[key];
        if (typeof v === "number" && v > 0) covered.add(key);
      }
    }
    for (const key of MAJOR_REGION_KEYS) {
      expect(covered.has(key)).toBe(true);
    }
  });

  it("registry validation passes for all seeded rows", () => {
    expect(validateExerciseIntelligenceRegistry()).toEqual([]);
    for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
      expect(validateExerciseIntelligenceV1(row)).toBe(true);
    }
  });

  it("mergeExerciseIntelligenceForId attaches hypertrophy overlay for seeded ids", () => {
    const m = mergeExerciseIntelligenceForId("bench_press");
    expect(m.hypertrophyIntelligence?.exerciseId).toBe("bench_press");
    expect(m.hypertrophyIntelligence?.fatigue).toBeGreaterThan(0);
    expect(m.hypertrophyIntelligence?.stimulus.midChest).toBeGreaterThan(0);
    expect(m.chestClassification?.primaryPattern).toBe("horizontal_press");
  });

  it("mergeExerciseIntelligenceForId returns null overlay for non-seeded library exercises", () => {
    const m = mergeExerciseIntelligenceForId("pec_stretch");
    expect(m.libraryItem).not.toBeNull();
    expect(m.hypertrophyIntelligence).toBeNull();
  });

  it("mergeExerciseIntelligenceForId is safe for unknown ids", () => {
    const m = mergeExerciseIntelligenceForId("totally_unknown_exercise_xyz");
    expect(m.libraryItem).toBeNull();
    expect(m.hypertrophyIntelligence).toBeNull();
  });

  it("getExerciseIntelligenceV1 returns null for blank ids", () => {
    expect(getExerciseIntelligenceV1("")).toBeNull();
    expect(getExerciseIntelligenceV1("   ")).toBeNull();
  });
});

describe("resolveExerciseIntelligenceForAnalytics + hypertrophy overlay", () => {
  it("preserves existing analytics fields for bench_press", () => {
    const r = resolveExerciseIntelligenceForAnalytics("bench_press");
    expect(r.exerciseId).toBe("bench_press");
    expect(r.resolutionExerciseId).toBe("bench_press");
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.classificationSource).toBe("classification");
    expect(r.hasContributionMap).toBe(true);
    expect(r.contributions?.length).toBeGreaterThan(0);
    expect(r.hypertrophyIntelligence?.exerciseId).toBe("bench_press");
  });

  it("exposes hypertrophy overlay for seeded exercise without contribution map", () => {
    const r = resolveExerciseIntelligenceForAnalytics("machine_chest_press");
    expect(r.hasContributionMap).toBe(false);
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.classificationSource).toBe("classification");
    expect(r.hypertrophyIntelligence?.stimulus.midChest).toBeGreaterThan(0);
  });

  it("non-seeded exercises keep null overlay and existing fallbacks", () => {
    const r = resolveExerciseIntelligenceForAnalytics("pec_stretch");
    expect(r.hypertrophyIntelligence).toBeNull();
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.classificationSource).toBe("classification");
  });

  it("custom muscleContributions still take precedence over catalog contributions", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map([
        [
          "custom_u1_mc",
          {
            exerciseId: "custom_u1_mc",
            name: "Zebra move",
            equipment: "Dumbbell",
            primary: "Legs",
            loggingType: "weight_reps",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            muscleContributions: [
              { subgroup: "gastrocnemius", weight: 0.6 },
              { subgroup: "soleus", weight: 0.4 },
            ],
          },
        ],
      ]),
    };
    const r = resolveExerciseIntelligenceForAnalytics("custom_u1_mc", ctx);
    expect(r.primaryMuscleGroup).toBe("calves");
    expect(r.classificationSource).toBe("contribution");
    expect(r.hypertrophyIntelligence).toBeNull();
  });

  it("catalog alias inherits hypertrophy overlay from resolution id", () => {
    const ctx: ExerciseAnalyticsResolutionContext = {
      customExerciseById: new Map([
        [
          "custom_u1_bench",
          {
            exerciseId: "custom_u1_bench",
            name: "Bench Press",
            equipment: "Barbell",
            primary: "Chest",
            loggingType: "weight_reps",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      ]),
    };
    const r = resolveExerciseIntelligenceForAnalytics("custom_u1_bench", ctx);
    expect(r.resolutionExerciseId).toBe("bench_press");
    expect(r.hypertrophyIntelligence?.exerciseId).toBe("bench_press");
  });
});

describe("strength taxonomy aggregate unchanged by overlay", () => {
  function benchExercise(volumeKg: number): ManualWorkoutExerciseSummary {
    return {
      exerciseId: "bench_press",
      name: "Bench Press",
      sets: [{ setNumber: 1, reps: 8, weightKg: volumeKg / 8, intensity: 8, isWarmup: false }],
    };
  }

  it("muscle volume split matches pre-overlay contribution weights for bench_press", () => {
    const maps = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, [benchExercise(800)]);
    const serialized = serializeStrengthTaxonomyMaps(maps);
    expect(serialized?.strengthTrainingVolumeKg).toBe(800);
    expect(serialized?.muscleVolumeKgByGroup.chest).toBeCloseTo(800 * 0.55, 1);
    expect(serialized?.muscleVolumeKgByGroup.triceps).toBeCloseTo(800 * 0.25, 1);
    expect(serialized?.muscleVolumeKgByGroup.shoulders).toBeCloseTo(800 * 0.2, 1);
  });

  it("unmapped seeded exercise without contributions allocates volume to primary muscle", () => {
    const maps = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, [
      {
        exerciseId: "barbell_curl",
        name: "Barbell Curl",
        sets: [{ setNumber: 1, reps: 10, weightKg: 3, intensity: 7, isWarmup: false }],
      },
    ]);
    const serialized = serializeStrengthTaxonomyMaps(maps);
    expect(serialized?.muscleVolumeKgByGroup.biceps).toBe(30);
    expect(getExerciseIntelligenceV1("barbell_curl")).not.toBeNull();
  });
});
