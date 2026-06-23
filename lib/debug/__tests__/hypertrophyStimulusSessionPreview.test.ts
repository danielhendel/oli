import {
  buildHypertrophyStimulusSessionPreviewModel,
  formatHypertrophyFallbackExerciseIds,
  mapManualWorkoutSummaryToHypertrophyStimulusSets,
} from "@/lib/debug/hypertrophyStimulusSessionPreview";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { buildHypertrophyStimulusSessionSummary } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusSessionSummary";

function sampleSession(overrides?: Partial<ManualWorkoutDaySummary>): ManualWorkoutDaySummary {
  return {
    sessionId: "session-1",
    day: "2026-06-01",
    startedAt: "2026-06-01T12:00:00.000Z",
    customName: null,
    totalVolume: 800,
    avgIntensity: 8,
    exercises: [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [{ setNumber: 1, reps: 8, weightKg: 100, intensity: 8, isWarmup: false }],
      },
      {
        exerciseId: "pec_stretch",
        name: "Pec Stretch",
        sets: [{ setNumber: 1, reps: 10, weightKg: null, intensity: null, isWarmup: false }],
      },
    ],
    ...overrides,
  };
}

describe("buildHypertrophyStimulusSessionPreviewModel", () => {
  it("handles no completed sessions with a clear empty state", () => {
    const model = buildHypertrophyStimulusSessionPreviewModel({ sessions: [] });
    expect(model.emptyReason).toBe("no_sessions");
    expect(model.selectedSession).toBeNull();
    expect(model.summary).toBeNull();
    expect(model.availableSessions).toEqual([]);
    expect(model.fallbackExerciseLabel).toBe("None");
  });

  it("maps completed session sets into buildHypertrophyStimulusSessionSummary", () => {
    const session = sampleSession();
    const mappedSets = mapManualWorkoutSummaryToHypertrophyStimulusSets(session);
    const expected = buildHypertrophyStimulusSessionSummary({
      sessionId: session.sessionId,
      sets: mappedSets,
    });

    const model = buildHypertrophyStimulusSessionPreviewModel({ sessions: [session] });

    expect(model.emptyReason).toBeNull();
    expect(model.selectedSession?.sessionId).toBe("session-1");
    expect(model.summary).toEqual(expected);
    expect(model.summary?.stimulusByRegion.midChest).toBeGreaterThan(0);
    expect(model.summary?.sourceCounts.hypertrophy_intelligence_v1).toBe(1);
    expect(model.summary?.sourceCounts.fallback).toBe(1);
  });

  it("selects the most recent session by default", () => {
    const older = sampleSession({
      sessionId: "older",
      startedAt: "2026-05-01T12:00:00.000Z",
      day: "2026-05-01",
    });
    const newer = sampleSession({
      sessionId: "newer",
      startedAt: "2026-06-02T12:00:00.000Z",
      day: "2026-06-02",
      exercises: [
        {
          exerciseId: "squat",
          name: "Squat",
          sets: [{ setNumber: 1, reps: 5, weightKg: 140, intensity: 9, isWarmup: false }],
        },
      ],
    });

    const model = buildHypertrophyStimulusSessionPreviewModel({
      sessions: [older, newer],
    });

    expect(model.selectedSession?.sessionId).toBe("newer");
    expect(model.summary?.stimulusByRegion.quads).toBeGreaterThan(0);
  });

  it("ignores warmup sets when mapping manual workout summaries", () => {
    const session = sampleSession({
      exercises: [
        {
          exerciseId: "bench_press",
          name: "Bench Press",
          sets: [
            { setNumber: 1, reps: 20, weightKg: 60, intensity: 5, isWarmup: true },
            { setNumber: 2, reps: 8, weightKg: 100, intensity: 8, isWarmup: false },
          ],
        },
      ],
    });

    const mapped = mapManualWorkoutSummaryToHypertrophyStimulusSets(session);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({ reps: 8 });
  });
});

describe("formatHypertrophyFallbackExerciseIds", () => {
  it("returns display-safe fallback exercise ids", () => {
    expect(formatHypertrophyFallbackExerciseIds(["pec_stretch", "  bench_press  "])).toBe(
      "pec_stretch, bench_press",
    );
    expect(formatHypertrophyFallbackExerciseIds(["bad id!", ""])).toBe("None");
  });
});
