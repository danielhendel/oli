import { buildHypertrophyStimulusWeekDetail } from "../intelligence/buildHypertrophyStimulusWeekDetail";
import { getExerciseIntelligenceV1 } from "../intelligence/exerciseIntelligenceV1Registry";

describe("buildHypertrophyStimulusWeekDetail", () => {
  it("aggregates seeded exercises by region", () => {
    const detail = buildHypertrophyStimulusWeekDetail({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 8, rpe: 8 },
            { exerciseId: "squat", reps: 5, rpe: 9 },
          ],
        },
        {
          sessionId: "session-2",
          completedAt: "2026-03-12T12:00:00.000Z",
          sets: [{ exerciseId: "lateral_raise", reps: 12, rpe: 9 }],
        },
      ],
    });

    expect(detail.weekStart).toBe("2026-03-09");
    expect(detail.weekEnd).toBe("2026-03-15");
    expect(detail.sessionCount).toBe(2);
    expect(detail.workingSetCount).toBe(3);
    expect(detail.totalEstimatedStimulus).toBeGreaterThan(0);
    expect(detail.regions.length).toBeGreaterThan(0);
    expect(detail.regions[0]!.percentOfWeekStimulus).toBeGreaterThan(0);
  });

  it("lists top contributing exercises per region", () => {
    const detail = buildHypertrophyStimulusWeekDetail({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 8, rpe: 8 },
            { exerciseId: "squat", reps: 5, rpe: 9 },
          ],
        },
      ],
    });

    const chestRegion = detail.regions.find((region) => region.region === "midChest");
    const quadRegion = detail.regions.find((region) => region.region === "quads");

    expect(chestRegion).toBeDefined();
    expect(quadRegion).toBeDefined();
    expect(chestRegion!.topExercises[0]?.exerciseId).toBe("bench_press");
    expect(quadRegion!.topExercises[0]?.exerciseId).toBe("squat");
    expect(chestRegion!.topExercises[0]?.setCount).toBe(1);
    expect(chestRegion!.topExercises[0]?.source).toBe("hypertrophy_intelligence_v1");
  });

  it("ignores warmup sets", () => {
    const workingOnly = buildHypertrophyStimulusWeekDetail({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-warmup-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [{ exerciseId: "bench_press", reps: 8, rpe: 8 }],
        },
      ],
    });
    const withWarmup = buildHypertrophyStimulusWeekDetail({
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

    expect(withWarmup.workingSetCount).toBe(workingOnly.workingSetCount);
    expect(withWarmup.totalEstimatedStimulus).toBeCloseTo(
      workingOnly.totalEstimatedStimulus,
      5,
    );
  });

  it("lists fallback exercises without contributing stimulus", () => {
    const detail = buildHypertrophyStimulusWeekDetail({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-fallback",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "pec_stretch", reps: 10, rpe: 7 },
            { exerciseId: "bench_press", reps: 8, rpe: 8 },
          ],
        },
      ],
    });

    expect(detail.fallbackExercises.map((row) => row.exerciseId)).toEqual(["pec_stretch"]);
    expect(detail.fallbackExercises[0]?.setCount).toBe(1);
    expect(detail.totalEstimatedStimulus).toBeGreaterThan(0);
    expect(getExerciseIntelligenceV1("pec_stretch")).toBeNull();
  });

  it("returns a safe empty model when no sessions exist", () => {
    const detail = buildHypertrophyStimulusWeekDetail({
      weekStart: "2026-03-09",
      sessions: [],
    });

    expect(detail).toEqual({
      weekStart: "2026-03-09",
      weekEnd: "2026-03-15",
      totalEstimatedStimulus: 0,
      estimatedFatigue: 0,
      recoveryDemand: 0,
      regions: [],
      fallbackExercises: [],
      sessionCount: 0,
      workingSetCount: 0,
    });
  });
});
