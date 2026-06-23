import { calculateHypertrophyStimulus } from "../intelligence/calculateHypertrophyStimulus";
import { buildHypertrophyStimulusSessionSummary } from "../intelligence/buildHypertrophyStimulusSessionSummary";
import { buildHypertrophyStimulusWeekSummary } from "../intelligence/buildHypertrophyStimulusWeekSummary";

describe("buildHypertrophyStimulusWeekSummary", () => {
  it("aggregates seeded sessions across the week", () => {
    const sessionOne = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-1",
      sets: [{ exerciseId: "bench_press", reps: 8, rpe: 8 }],
    });
    const sessionTwo = buildHypertrophyStimulusSessionSummary({
      sessionId: "session-2",
      sets: [{ exerciseId: "squat", reps: 5, rpe: 9 }],
    });

    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [{ exerciseId: "bench_press", reps: 8, rpe: 8 }],
        },
        {
          sessionId: "session-2",
          completedAt: "2026-03-12T12:00:00.000Z",
          sets: [{ exerciseId: "squat", reps: 5, rpe: 9 }],
        },
      ],
    });

    expect(summary.sessionCount).toBe(2);
    expect(summary.totalEstimatedStimulus).toBeCloseTo(
      sessionOne.totalEstimatedStimulus + sessionTwo.totalEstimatedStimulus,
      5,
    );
    expect(summary.stimulusByRegion.midChest).toBeCloseTo(sessionOne.stimulusByRegion.midChest!, 5);
    expect(summary.stimulusByRegion.quads).toBeCloseTo(sessionTwo.stimulusByRegion.quads!, 5);
    expect(summary.estimatedFatigue).toBeCloseTo(
      sessionOne.estimatedFatigue + sessionTwo.estimatedFatigue,
      5,
    );
    expect(summary.topStimulusRegions.length).toBeGreaterThan(0);
    expect(summary.fallbackExerciseCount).toBe(0);
  });

  it("ignores warmup sets when aggregating", () => {
    const workingOnly = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-warmup-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [{ exerciseId: "bench_press", reps: 8, rpe: 8 }],
        },
      ],
    });
    const withWarmup = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-warmup-2",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 20, rpe: 5, isWarmup: true },
            { exerciseId: "bench_press", reps: 8, rpe: 8, isWarmup: false },
          ],
        },
      ],
    });

    expect(withWarmup.totalEstimatedStimulus).toBeCloseTo(
      workingOnly.totalEstimatedStimulus,
      5,
    );
    expect(withWarmup.estimatedFatigue).toBeCloseTo(workingOnly.estimatedFatigue, 5);
    expect(withWarmup.sessionCount).toBe(1);
  });

  it("counts fallback exercises across sessions", () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-fallback-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [{ exerciseId: "pec_stretch", reps: 10, rpe: 7 }],
        },
        {
          sessionId: "session-fallback-2",
          completedAt: "2026-03-11T12:00:00.000Z",
          sets: [
            { exerciseId: "pec_stretch", reps: 10, rpe: 7 },
            { exerciseId: "unknown_move", reps: 8, rpe: 8 },
          ],
        },
      ],
    });

    expect(summary.sessionCount).toBe(2);
    expect(summary.fallbackExerciseCount).toBe(2);
    expect(summary.totalEstimatedStimulus).toBe(0);
  });

  it("orders top stimulus regions deterministically", () => {
    const bench = calculateHypertrophyStimulus({
      exerciseId: "bench_press",
      sets: [{ reps: 10, rpe: 8 }],
    });
    const squat = calculateHypertrophyStimulus({
      exerciseId: "squat",
      sets: [{ reps: 8, rpe: 8 }],
    });

    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-order-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 10, rpe: 8 },
            { exerciseId: "squat", reps: 8, rpe: 8 },
          ],
        },
      ],
    });

    expect(summary.topStimulusRegions[0]!.stimulus).toBeGreaterThanOrEqual(
      summary.topStimulusRegions[1]?.stimulus ?? 0,
    );
    expect(summary.stimulusByRegion.midChest).toBeCloseTo(bench.stimulusByRegion.midChest!, 5);
    expect(summary.stimulusByRegion.quads).toBeCloseTo(squat.stimulusByRegion.quads!, 5);
  });

  it("returns zero session count for an empty week", () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [],
    });

    expect(summary.sessionCount).toBe(0);
    expect(summary.totalEstimatedStimulus).toBe(0);
    expect(summary.topStimulusRegions).toEqual([]);
  });
});
