import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  deriveSessionTypeFlags,
  matchReconciledWorkoutSessionToLatestDayWorkouts,
  reconcileWorkoutSessionsForDay,
  resolveReconciledSessionWithLatestCalendarDays,
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

  it("collapses overlapping manual + apple records for the same workout", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({
        id: "manual-1",
        sourceId: "manual",
        title: "Push Day",
        workoutType: "strength",
        start: "2026-03-20T09:00:00.000Z",
        end: "2026-03-20T10:05:00.000Z",
        durationMinutes: 65,
      }),
      w({
        id: "apple-1",
        sourceId: "apple_health",
        title: "TraditionalStrengthTraining",
        workoutType: "strength",
        start: "2026-03-20T09:10:00.000Z",
        end: "2026-03-20T10:00:00.000Z",
        durationMinutes: 50,
      }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toBe("Push Day");
    expect(sessions[0]?.workouts).toHaveLength(2);
  });

  it("keeps same-day strength then late cardio separate", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({ id: "s", workoutType: "strength", start: "2026-03-20T17:00:00.000Z", durationMinutes: 60 }),
      w({ id: "c", workoutType: "cardio", start: "2026-03-20T20:00:00.000Z", durationMinutes: 30 }),
    ]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.sessionType).toBe("strength");
    expect(sessions[1]?.sessionType).toBe("cardio");
  });

  it("merges nearby same-family provider records into one session", () => {
    const sessions = reconcileWorkoutSessionsForDay("2026-03-20", [
      w({
        id: "provider-1",
        sourceId: "apple_health",
        workoutType: "cardio",
        title: "Outdoor Run",
        start: "2026-03-20T07:00:00.000Z",
        end: "2026-03-20T07:40:00.000Z",
        durationMinutes: 40,
      }),
      w({
        id: "provider-2",
        sourceId: "apple_health",
        workoutType: "cardio",
        title: "Running",
        start: "2026-03-20T07:10:00.000Z",
        end: "2026-03-20T07:43:00.000Z",
        durationMinutes: 33,
      }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.workouts).toHaveLength(2);
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

  it("matchReconciledWorkoutSessionToLatestDayWorkouts rebinds when merged session loses a member (session id changes)", () => {
    const day = "2026-03-20";
    const both = [
      w({ id: "manual-1", sourceId: "manual", workoutType: "strength", start: "2026-03-20T17:00:00.000Z", durationMinutes: 60 }),
      w({
        id: "apple-1",
        sourceId: "apple_health",
        title: "TraditionalStrengthTraining",
        workoutType: "strength",
        start: "2026-03-20T17:20:00.000Z",
        durationMinutes: 50,
      }),
    ];
    const stale = reconcileWorkoutSessionsForDay(day, both)[0]!;
    const onlyApple = both.filter((x) => x.id === "apple-1");
    const matched = matchReconciledWorkoutSessionToLatestDayWorkouts(day, stale, onlyApple);
    expect(matched).not.toBeNull();
    expect(matched!.id).not.toBe(stale.id);
    expect(matched!.workouts.map((x) => x.id)).toEqual(["apple-1"]);
  });

  it("resolveReconciledSessionWithLatestCalendarDays returns same session when day bucket unchanged", () => {
    const day = "2026-03-20";
    const workouts = [w({ id: "solo", sourceId: "manual", workoutType: "strength", start: "2026-03-20T08:00:00.000Z", durationMinutes: 40 })];
    const stale = reconcileWorkoutSessionsForDay(day, workouts)[0]!;
    const out = resolveReconciledSessionWithLatestCalendarDays([{ day, workouts }], { day, session: stale });
    expect(out.id).toBe(stale.id);
    expect(out.workouts.map((x) => x.id)).toEqual(["solo"]);
  });
});
