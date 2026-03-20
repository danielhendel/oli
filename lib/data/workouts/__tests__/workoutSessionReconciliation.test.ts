import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  deriveSessionTypeFlags,
  reconcileWorkoutSessionsForDay,
} from "@/lib/data/workouts/workoutSessionReconciliation";

function w(overrides: Partial<WorkoutHistoryItem>): WorkoutHistoryItem {
  return {
    id: "w",
    observedAt: "2026-03-20T10:00:00.000Z",
    sourceId: "apple_health",
    title: "Workout",
    workoutType: "cardio",
    start: "2026-03-20T10:00:00.000Z",
    end: null,
    durationMinutes: 30,
    calories: null,
    ...overrides,
  };
}

describe("workoutSessionReconciliation", () => {
  it("merges overlapping manual+provider strength into one session", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "a", sourceId: "manual", title: "Leg day", workoutType: "strength", start: "2026-03-20T17:00:00.000Z", durationMinutes: 60 }),
      w({ id: "b", sourceId: "apple_health", title: "TraditionalStrengthTraining", workoutType: "strength", start: "2026-03-20T17:20:00.000Z", durationMinutes: 50 }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.workouts).toHaveLength(2);
  });

  it("keeps same-day strength then late cardio separate", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "s", workoutType: "strength", start: "2026-03-20T17:00:00.000Z", durationMinutes: 60 }),
      w({ id: "c", workoutType: "cardio", start: "2026-03-20T20:00:00.000Z", durationMinutes: 30 }),
    ]);
    expect(sessions).toHaveLength(2);
  });

  it("keeps separated strength sessions apart for large gaps", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "s1", workoutType: "strength", start: "2026-03-20T08:00:00.000Z", durationMinutes: 45 }),
      w({ id: "s2", workoutType: "strength", start: "2026-03-20T12:00:00.000Z", durationMinutes: 45 }),
    ]);
    expect(sessions).toHaveLength(2);
  });

  it("title precedence favors manual title", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "a", sourceId: "apple_health", title: "TraditionalStrengthTraining", workoutType: "strength" }),
      w({ id: "b", sourceId: "manual", title: "Push Day", workoutType: "strength", start: "2026-03-20T10:10:00.000Z" }),
    ]);
    expect(sessions[0]?.title).toBe("Push Day");
    expect(sessions[0]?.titleSource).toBe("manual");
  });

  it("preserves source summaries", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "a", sourceId: "manual", workoutType: "strength" }),
      w({ id: "b", sourceId: "apple_health", workoutType: "strength", start: "2026-03-20T10:10:00.000Z" }),
    ]);
    expect(sessions[0]?.sourceSummaries).toHaveLength(2);
  });

  it("mixed-day flags remain correct after reconciliation", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "s", workoutType: "strength", start: "2026-03-20T10:00:00.000Z" }),
      w({ id: "c", workoutType: "cardio", start: "2026-03-20T20:00:00.000Z" }),
    ]);
    expect(deriveSessionTypeFlags(sessions)).toEqual({ hasStrength: true, hasCardio: true });
  });

  it("manual + apple uses manual duration only", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "m1", sourceId: "manual", workoutType: "strength", durationMinutes: 45 }),
      w({ id: "a1", sourceId: "apple_health", workoutType: "strength", durationMinutes: 134, start: "2026-03-20T10:05:00.000Z" }),
    ]);
    expect(sessions[0]?.durationMinutes).toBe(45);
  });

  it("apple-only uses provider duration", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "a1", sourceId: "apple_health", workoutType: "cardio", durationMinutes: 70 }),
    ]);
    expect(sessions[0]?.durationMinutes).toBe(70);
  });

  it("multiple manual segments sum duration", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "m1", sourceId: "manual", workoutType: "strength", durationMinutes: 30 }),
      w({ id: "m2", sourceId: "manual", workoutType: "strength", durationMinutes: 20, start: "2026-03-20T10:10:00.000Z" }),
      w({ id: "a1", sourceId: "apple_health", workoutType: "strength", durationMinutes: 200, start: "2026-03-20T10:20:00.000Z" }),
    ]);
    expect(sessions[0]?.durationMinutes).toBe(50);
  });
});
