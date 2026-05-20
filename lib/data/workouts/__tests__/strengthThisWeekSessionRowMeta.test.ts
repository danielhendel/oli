import { buildStrengthThisWeekSessionMetadataLine } from "@/lib/data/workouts/strengthThisWeekSessionRowMeta";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

describe("strengthThisWeekSessionRowMeta", () => {
  const journal: ManualWorkoutDaySummary = {
    sessionId: "s1",
    day: "2026-03-12",
    startedAt: "2026-03-12T10:00:00.000Z",
    customName: null,
    totalVolume: null,
    avgIntensity: null,
    exercises: [
      {
        exerciseId: "bench_press",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 100, intensity: 8 },
          { setNumber: 2, reps: 10, weightKg: 100, intensity: 7 },
          { setNumber: 3, reps: 10, weightKg: 100, intensity: 5 },
        ],
      },
    ],
  };

  const actionWorkout = {
    id: "w1",
    observedAt: "2026-03-12T10:00:00.000Z",
    sourceId: "manual",
    title: "Push Day",
    workoutType: "strength" as const,
    start: "2026-03-12T10:00:00.000Z",
    end: "2026-03-12T11:00:00.000Z",
    durationMinutes: 57,
    calories: null,
  };

  it("joins set/focus summary and duration with bullet separators", () => {
    expect(buildStrengthThisWeekSessionMetadataLine(journal, actionWorkout, 57)).toBe(
      "3 sets • Chest focused • 57 min",
    );
  });

  it("omits duration when unavailable", () => {
    expect(buildStrengthThisWeekSessionMetadataLine(journal, actionWorkout, null)).toBe(
      "3 sets • Chest focused",
    );
  });

  it("returns empty metadata when no exercises and no duration", () => {
    expect(buildStrengthThisWeekSessionMetadataLine(null, actionWorkout, null)).toBe("");
  });
});
