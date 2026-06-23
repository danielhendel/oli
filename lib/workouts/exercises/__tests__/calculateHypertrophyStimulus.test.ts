import {
  createEmptyStrengthTaxonomyMaps,
  mergeManualExercisesIntoStrengthTaxonomyMaps,
  serializeStrengthTaxonomyMaps,
} from "@/lib/data/workouts/strengthTaxonomySummaryAggregate";
import { resolveExerciseIntelligenceForAnalytics } from "../exerciseAnalyticsIntelligence";
import {
  calculateHypertrophyStimulus,
  rpeFactorForHypertrophyStimulus,
} from "../intelligence/calculateHypertrophyStimulus";
import { getExerciseIntelligenceV1 } from "../intelligence/exerciseIntelligenceV1Registry";

describe("rpeFactorForHypertrophyStimulus", () => {
  it("returns 1 when RPE is missing", () => {
    expect(rpeFactorForHypertrophyStimulus(undefined)).toBe(1);
    expect(rpeFactorForHypertrophyStimulus(null)).toBe(1);
  });

  it("maps discrete RPE buckets", () => {
    expect(rpeFactorForHypertrophyStimulus(10)).toBe(1);
    expect(rpeFactorForHypertrophyStimulus(9)).toBe(0.95);
    expect(rpeFactorForHypertrophyStimulus(8)).toBe(0.9);
    expect(rpeFactorForHypertrophyStimulus(7)).toBe(0.8);
    expect(rpeFactorForHypertrophyStimulus(6)).toBe(0.65);
    expect(rpeFactorForHypertrophyStimulus(5)).toBe(0.65);
  });
});

describe("calculateHypertrophyStimulus", () => {
  it("calculates regional stimulus for a seeded exercise", () => {
    const intelligence = getExerciseIntelligenceV1("bench_press");
    expect(intelligence).not.toBeNull();

    const result = calculateHypertrophyStimulus({
      exerciseId: "bench_press",
      sets: [{ reps: 8, loadKg: 100, rpe: 8 }],
    });

    expect(result.source).toBe("hypertrophy_intelligence_v1");
    const effectiveReps = 8 * 0.9;
    expect(result.stimulusByRegion.midChest).toBeCloseTo(effectiveReps * intelligence!.stimulus.midChest!, 5);
    expect(result.stimulusByRegion.triceps).toBeCloseTo(effectiveReps * intelligence!.stimulus.triceps!, 5);
    expect(result.estimatedFatigue).toBeCloseTo(effectiveReps * intelligence!.fatigue, 5);
    expect(result.recoveryDemand).toBeCloseTo(
      effectiveReps * intelligence!.fatigue * intelligence!.recoveryDemand,
      5,
    );
  });

  it("sums multiple sets", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "lateral_raise",
      sets: [
        { reps: 12, rpe: 9 },
        { reps: 12, rpe: 8 },
      ],
    });
    expect(result.source).toBe("hypertrophy_intelligence_v1");
    const intelligence = getExerciseIntelligenceV1("lateral_raise")!;
    const set1 = 12 * 0.95;
    const set2 = 12 * 0.9;
    const expectedSideDelts = (set1 + set2) * intelligence.stimulus.sideDelts!;
    expect(result.stimulusByRegion.sideDelts).toBeCloseTo(expectedSideDelts, 5);
  });

  it("works when RPE is missing (factor 1)", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "squat",
      sets: [{ reps: 5, loadKg: 140 }],
    });
    expect(result.source).toBe("hypertrophy_intelligence_v1");
    const intelligence = getExerciseIntelligenceV1("squat")!;
    expect(result.stimulusByRegion.quads).toBeCloseTo(5 * intelligence.stimulus.quads!, 5);
    expect(result.estimatedFatigue).toBeCloseTo(5 * intelligence.fatigue, 5);
  });

  it("returns safe fallback for non-seeded exercises", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "pec_stretch",
      sets: [{ reps: 10, loadKg: 20, rpe: 8 }],
    });
    expect(result).toEqual({
      stimulusByRegion: {},
      estimatedFatigue: 0,
      recoveryDemand: 0,
      source: "fallback",
    });
  });

  it("calculates stimulus for a Phase 4 seeded exercise (hip_thrust)", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "hip_thrust",
      sets: [{ reps: 10, loadKg: 120, rpe: 8 }],
    });
    expect(result.source).toBe("hypertrophy_intelligence_v1");
    expect(result.stimulusByRegion.glutes).toBeGreaterThan(0);
    expect(result.estimatedFatigue).toBeGreaterThan(0);
    expect(result.recoveryDemand).toBeGreaterThan(0);
  });

  it("calculates stimulus for a Phase 6 seeded exercise (tibia_raise)", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "tibia_raise",
      sets: [{ reps: 15, rpe: 7 }],
    });
    expect(result.source).toBe("hypertrophy_intelligence_v1");
    expect(result.stimulusByRegion.tibialis).toBeGreaterThan(0);
    expect(result.estimatedFatigue).toBeGreaterThan(0);
  });

  it("calculates stimulus for a Phase 6 seeded exercise (deadlift)", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "deadlift",
      sets: [{ reps: 5, loadKg: 180, rpe: 9 }],
    });
    expect(result.source).toBe("hypertrophy_intelligence_v1");
    expect(result.stimulusByRegion.hamstrings).toBeGreaterThan(0);
    expect(result.estimatedFatigue).toBeGreaterThan(0);
  });

  it("returns fallback for blank exerciseId", () => {
    expect(
      calculateHypertrophyStimulus({
        exerciseId: "  ",
        sets: [{ reps: 10 }],
      }).source,
    ).toBe("fallback");
  });

  it("skips invalid reps", () => {
    const result = calculateHypertrophyStimulus({
      exerciseId: "bench_press",
      sets: [{ reps: 0 }, { reps: -1 }, { reps: Number.NaN }],
    });
    expect(result.source).toBe("hypertrophy_intelligence_v1");
    expect(result.stimulusByRegion).toEqual({});
    expect(result.estimatedFatigue).toBe(0);
  });
});

describe("existing volume analytics unchanged", () => {
  it("resolveExerciseIntelligenceForAnalytics behavior unchanged for bench_press", () => {
    const r = resolveExerciseIntelligenceForAnalytics("bench_press");
    expect(r.primaryMuscleGroup).toBe("chest");
    expect(r.hasContributionMap).toBe(true);
    expect(r.hypertrophyIntelligence?.exerciseId).toBe("bench_press");
  });

  it("strength taxonomy volume split unchanged after stimulus utility exists", () => {
    const maps = createEmptyStrengthTaxonomyMaps();
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [{ setNumber: 1, reps: 8, weightKg: 100, intensity: 8, isWarmup: false }],
      },
    ]);
    const serialized = serializeStrengthTaxonomyMaps(maps);
    expect(serialized?.strengthTrainingVolumeKg).toBe(800);
    expect(serialized?.muscleVolumeKgByGroup.chest).toBeCloseTo(440, 1);
  });
});
