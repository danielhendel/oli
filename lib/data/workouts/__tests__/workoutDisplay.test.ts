import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  formatWorkoutRowSummary,
  formatWorkoutSourceLabel,
  formatWorkoutTimeLabel,
  formatWorkoutTitle,
} from "@/lib/data/workouts/workoutDisplay";

function sampleWorkout(overrides: Partial<WorkoutHistoryItem> = {}): WorkoutHistoryItem {
  return {
    id: "w1",
    observedAt: "2026-03-18T10:00:00.000Z",
    sourceId: "apple_health",
    title: "Running",
    start: "2026-03-18T10:00:00.000Z",
    end: null,
    durationMinutes: 30,
    calories: 250,
    ...overrides,
  };
}

describe("workoutDisplay", () => {
  it("formats known Apple Health titles cleanly", () => {
    expect(formatWorkoutTitle("TraditionalStrengthTraining")).toBe("Strength Training");
    expect(formatWorkoutTitle("IndoorCycle")).toBe("Indoor Cycling");
    expect(formatWorkoutTitle("Running")).toBe("Running");
  });

  it("preserves custom names and handles fallback", () => {
    expect(formatWorkoutTitle("Chest Day")).toBe("Chest Day");
    expect(formatWorkoutTitle("")).toBe("Workout");
    expect(formatWorkoutTitle(null)).toBe("Workout");
  });

  it("formats source labels deterministically", () => {
    expect(formatWorkoutSourceLabel(sampleWorkout({ sourceId: "apple_health" }))).toBe("Apple Health");
    expect(formatWorkoutSourceLabel(sampleWorkout({ sourceId: "manual" }))).toBe("Manual");
    expect(
      formatWorkoutSourceLabel(sampleWorkout({ sourceId: "apple_health", hk: { sourceId: "Watch", activityId: 1 } })),
    ).toBe("Apple Health · Watch");
  });

  it("formats row summary with optional fields", () => {
    expect(formatWorkoutRowSummary(sampleWorkout())).toBe("30 min · 250 kcal · Apple Health");
    expect(formatWorkoutRowSummary(sampleWorkout({ durationMinutes: null, calories: null, sourceId: "manual" }))).toBe(
      "Manual",
    );
  });

  it("formats time labels safely", () => {
    expect(formatWorkoutTimeLabel(null)).toBe("—");
    expect(formatWorkoutTimeLabel("not-a-date")).toBe("—");
  });
});
