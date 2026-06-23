import { calculateHypertrophyStimulus } from "../intelligence/calculateHypertrophyStimulus";
import { buildHypertrophyStimulusSessionSummary } from "../intelligence/buildHypertrophyStimulusSessionSummary";
import { getExerciseIntelligenceV1 } from "../intelligence/exerciseIntelligenceV1Registry";

describe("buildHypertrophyStimulusSessionSummary", () => {
  it("returns regional totals for a seeded session", () => {
    const bench = calculateHypertrophyStimulus({
      exerciseId: "bench_press",
      sets: [{ reps: 8, rpe: 8 }],
    });
    const squat = calculateHypertrophyStimulus({
      exerciseId: "squat",
      sets: [{ reps: 5, rpe: 9 }],
    });

    const summary = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-seeded-1",
      sets: [
        { exerciseId: "bench_press", reps: 8, rpe: 8 },
        { exerciseId: "squat", reps: 5, rpe: 9 },
      ],
    });

    expect(summary.sessionId).toBe("session-seeded-1");
    expect(summary.sourceCounts.hypertrophy_intelligence_v1).toBe(2);
    expect(summary.sourceCounts.fallback).toBe(0);
    expect(summary.exercisesWithFallback).toEqual([]);
    expect(summary.stimulusByRegion.midChest).toBeCloseTo(bench.stimulusByRegion.midChest!, 5);
    expect(summary.stimulusByRegion.quads).toBeCloseTo(squat.stimulusByRegion.quads!, 5);
    expect(summary.estimatedFatigue).toBeCloseTo(
      bench.estimatedFatigue + squat.estimatedFatigue,
      5,
    );
    expect(summary.recoveryDemand).toBeCloseTo(
      bench.recoveryDemand + squat.recoveryDemand,
      5,
    );
    expect(summary.totalEstimatedStimulus).toBeGreaterThan(0);
    expect(summary.topStimulusRegions[0]!.stimulus).toBeGreaterThan(0);
  });

  it("ignores warmup sets", () => {
    const workingOnly = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-warmup-1",
      sets: [{ exerciseId: "bench_press", reps: 8, rpe: 8 }],
    });
    const withWarmup = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-warmup-2",
      sets: [
        { exerciseId: "bench_press", reps: 20, rpe: 5, isWarmup: true },
        { exerciseId: "bench_press", reps: 8, rpe: 8, isWarmup: false },
      ],
    });

    expect(withWarmup.totalEstimatedStimulus).toBeCloseTo(
      workingOnly.totalEstimatedStimulus,
      5,
    );
    expect(withWarmup.estimatedFatigue).toBeCloseTo(workingOnly.estimatedFatigue, 5);
    expect(withWarmup.sourceCounts).toEqual(workingOnly.sourceCounts);
  });

  it("counts unseeded exercises in fallback", () => {
    const summary = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-fallback-1",
      sets: [{ exerciseId: "pec_stretch", reps: 10, rpe: 7 }],
    });

    expect(summary.sourceCounts.fallback).toBe(1);
    expect(summary.sourceCounts.hypertrophy_intelligence_v1).toBe(0);
    expect(summary.exercisesWithFallback).toEqual(["pec_stretch"]);
    expect(summary.totalEstimatedStimulus).toBe(0);
    expect(summary.estimatedFatigue).toBe(0);
    expect(summary.topStimulusRegions).toEqual([]);
  });

  it("handles mixed seeded and unseeded exercises", () => {
    const summary = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-mixed-1",
      sets: [
        { exerciseId: "pec_stretch", reps: 10, rpe: 7 },
        { exerciseId: "bench_press", reps: 8, rpe: 8 },
        { exerciseId: "lateral_raise", reps: 12, rpe: 9 },
      ],
    });

    expect(summary.sourceCounts).toEqual({
      hypertrophy_intelligence_v1: 2,
      fallback: 1,
    });
    expect(summary.exercisesWithFallback).toEqual(["pec_stretch"]);
    expect(summary.stimulusByRegion.midChest).toBeGreaterThan(0);
    expect(summary.stimulusByRegion.sideDelts).toBeGreaterThan(0);
    expect(getExerciseIntelligenceV1("bench_press")).not.toBeNull();
    expect(getExerciseIntelligenceV1("pec_stretch")).toBeNull();
  });

  it("orders top stimulus regions deterministically", () => {
    const summary = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-order-1",
      sets: [
        { exerciseId: "bench_press", reps: 10, rpe: 8 },
        { exerciseId: "squat", reps: 8, rpe: 8 },
      ],
    });

    for (let i = 1; i < summary.topStimulusRegions.length; i += 1) {
      const prev = summary.topStimulusRegions[i - 1]!;
      const curr = summary.topStimulusRegions[i]!;
      expect(prev.stimulus).toBeGreaterThanOrEqual(curr.stimulus);
    }
  });
});
