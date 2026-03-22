import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  formatAvgPaceMinPerMileLabel,
  formatIntegerWithCommas,
  formatWorkoutDistanceLabel,
  formatWorkoutDurationLabel,
  formatWorkoutRowSummary,
  formatWorkoutSourceLabel,
  formatWorkoutTimeLabel,
  formatWorkoutTitle,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
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

  it("formats workout duration labels with hour/minute rules", () => {
    expect(formatWorkoutDurationLabel(45)).toBe("45 min");
    expect(formatWorkoutDurationLabel(60)).toBe("1 hr");
    expect(formatWorkoutDurationLabel(75)).toBe("1 hr 15 min");
    expect(formatWorkoutDurationLabel(120)).toBe("2 hr");
    expect(formatWorkoutDurationLabel(125)).toBe("2 hr 5 min");
  });

  it("formats integers with comma separators", () => {
    expect(formatIntegerWithCommas(2345)).toBe("2,345");
  });

  it("formats distance from meters", () => {
    expect(formatWorkoutDistanceLabel(null)).toBe("—");
    expect(formatWorkoutDistanceLabel(80)).toMatch(/km/);
    expect(formatWorkoutDistanceLabel(8046)).toMatch(/mi/);
  });

  it("formats avg pace min/mi when distance and duration known", () => {
    expect(formatAvgPaceMinPerMileLabel(null, 30)).toBe("—");
    expect(formatAvgPaceMinPerMileLabel(1609.344, 10)).toBe("10:00 /mi");
  });

  it("resolves display values with override precedence", () => {
    const base = sampleWorkout({
      title: "Running",
      durationMinutes: 30,
      workoutType: "cardio",
    });
    const resolved = resolveWorkoutDisplay(base, {
      workoutId: "w1",
      customTitle: "Leg Day",
      correctedDurationMinutes: 55,
      correctedWorkoutType: "strength",
      updatedAt: "2026-03-20T00:00:00.000Z",
    });
    expect(resolved.displayTitle).toBe("Leg Day");
    expect(resolved.displayDurationMinutes).toBe(55);
    expect(resolved.displayWorkoutType).toBe("strength");
  });

  it("resolves display duration precedence override > session > fallback", () => {
    expect(
      resolveWorkoutDisplayDurationMinutes({
        overrideDurationMinutes: 45,
        sessionDurationMinutes: 134,
        fallbackWorkoutDurationMinutes: 90,
      }),
    ).toBe(45);
    expect(
      resolveWorkoutDisplayDurationMinutes({
        overrideDurationMinutes: null,
        sessionDurationMinutes: 134,
        fallbackWorkoutDurationMinutes: 90,
      }),
    ).toBe(134);
    expect(
      resolveWorkoutDisplayDurationMinutes({
        overrideDurationMinutes: null,
        sessionDurationMinutes: null,
        fallbackWorkoutDurationMinutes: 90,
      }),
    ).toBe(90);
  });
});
