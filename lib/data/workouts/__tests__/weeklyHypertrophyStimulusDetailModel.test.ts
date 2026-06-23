import { buildWeeklyHypertrophyStimulusDetailFromJournal } from "@/lib/data/workouts/weeklyHypertrophyStimulusDetailModel";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

function buildSummary(
  day: string,
  sessionId: string,
  exercises: ManualWorkoutDaySummary["exercises"],
): ManualWorkoutDaySummary {
  return {
    sessionId,
    day,
    startedAt: `${day}T12:00:00.000Z`,
    customName: null,
    totalVolume: null,
    avgIntensity: null,
    exercises,
  };
}

describe("buildWeeklyHypertrophyStimulusDetailFromJournal", () => {
  it("maps journal summaries into a weekly detail model", () => {
    const detail = buildWeeklyHypertrophyStimulusDetailFromJournal({
      summaries: [
        buildSummary("2026-03-10", "session-1", [
          {
            exerciseId: "bench_press",
            name: "Bench Press",
            sets: [{ setNumber: 1, reps: 8, weightKg: 80, intensity: 8 }],
          },
        ]),
      ],
      weekStartDay: "2026-03-09",
    });

    expect(detail.weekStart).toBe("2026-03-09");
    expect(detail.weekEnd).toBe("2026-03-15");
    expect(detail.sessionCount).toBe(1);
    expect(detail.workingSetCount).toBe(1);
    expect(detail.regions.length).toBeGreaterThan(0);
    expect(detail.regions[0]?.topExercises[0]?.exerciseName.length).toBeGreaterThan(0);
  });

  it("returns an empty detail model for summaries outside the week", () => {
    const detail = buildWeeklyHypertrophyStimulusDetailFromJournal({
      summaries: [
        buildSummary("2026-03-02", "session-outside", [
          {
            exerciseId: "bench_press",
            name: "Bench Press",
            sets: [{ setNumber: 1, reps: 8, weightKg: 80, intensity: 8 }],
          },
        ]),
      ],
      weekStartDay: "2026-03-09",
    });

    expect(detail.sessionCount).toBe(0);
    expect(detail.regions).toEqual([]);
  });
});
