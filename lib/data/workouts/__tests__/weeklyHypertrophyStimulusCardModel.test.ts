import { buildWeeklyHypertrophyStimulusCardModelFromJournal } from "@/lib/data/workouts/weeklyHypertrophyStimulusCardModel";
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

describe("buildWeeklyHypertrophyStimulusCardModelFromJournal", () => {
  it("returns null when the week has no journal summaries", () => {
    expect(
      buildWeeklyHypertrophyStimulusCardModelFromJournal({
        summaries: [],
        weekStartDay: "2026-03-09",
        weekEndDay: "2026-03-15",
      }),
    ).toBeNull();
  });

  it("builds a card model from seeded journal summaries in the week window", () => {
    const model = buildWeeklyHypertrophyStimulusCardModelFromJournal({
      summaries: [
        buildSummary("2026-03-10", "session-1", [
          {
            exerciseId: "bench_press",
            name: "Bench Press",
            sets: [{ setNumber: 1, reps: 8, weightKg: 80, intensity: 8 }],
          },
        ]),
        buildSummary("2026-03-12", "session-2", [
          {
            exerciseId: "squat",
            name: "Squat",
            sets: [{ setNumber: 1, reps: 5, weightKg: 120, intensity: 9 }],
          },
        ]),
      ],
      weekStartDay: "2026-03-09",
      weekEndDay: "2026-03-15",
    });

    expect(model).not.toBeNull();
    expect(model!.topRegions.length).toBeGreaterThan(0);
  });

  it("ignores summaries outside the selected week", () => {
    const model = buildWeeklyHypertrophyStimulusCardModelFromJournal({
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
      weekEndDay: "2026-03-15",
    });

    expect(model).toBeNull();
  });
});
