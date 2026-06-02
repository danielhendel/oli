import { countReconciledStrengthTabSessionsForDay } from "../countReconciledStrengthTabSessionsForDay";
import type { CanonicalWorkoutEventForReconcile } from "../countReconciledStrengthTabSessionsForDay";

const day = "2026-06-01" as const;

function strengthWorkout(
  overrides: Partial<CanonicalWorkoutEventForReconcile & { kind: "strength_workout" }> &
    Pick<CanonicalWorkoutEventForReconcile & { kind: "strength_workout" }, "id" | "start" | "end">,
): CanonicalWorkoutEventForReconcile {
  return {
    kind: "strength_workout",
    sourceId: "manual",
    exercises: [{ exercise: "Bench Press" }],
    ...overrides,
  };
}

function appleStrengthWorkout(
  overrides: Partial<CanonicalWorkoutEventForReconcile & { kind: "workout" }> &
    Pick<CanonicalWorkoutEventForReconcile & { kind: "workout" }, "id" | "start" | "end">,
): CanonicalWorkoutEventForReconcile {
  return {
    kind: "workout",
    sourceId: "apple_health",
    sport: "TraditionalStrengthTraining",
    durationMinutes: 52,
    ...overrides,
  };
}

describe("countReconciledStrengthTabSessionsForDay", () => {
  it("counts 1 when manual strength_workout and Apple strength workout overlap the same session", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      strengthWorkout({
        id: "manual-1",
        start: "2026-06-01T17:00:00.000Z",
        end: "2026-06-01T18:00:00.000Z",
      }),
      appleStrengthWorkout({
        id: "apple-1",
        start: "2026-06-01T17:20:00.000Z",
        end: "2026-06-01T18:10:00.000Z",
        durationMinutes: 50,
      }),
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 1 when duplicate Apple strength workouts overlap (timezone / re-import variants)", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      appleStrengthWorkout({
        id: "apple-a",
        start: "2026-06-01T10:00:00.000Z",
        end: "2026-06-01T11:00:00.000Z",
        durationMinutes: 60,
      }),
      appleStrengthWorkout({
        id: "apple-b",
        start: "2026-06-01T10:05:00.000Z",
        end: "2026-06-01T11:05:00.000Z",
        durationMinutes: 60,
      }),
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 2 for two separated strength sessions on the same day", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      appleStrengthWorkout({
        id: "am",
        start: "2026-06-01T08:00:00.000Z",
        end: "2026-06-01T09:00:00.000Z",
        durationMinutes: 60,
      }),
      appleStrengthWorkout({
        id: "pm",
        start: "2026-06-01T17:00:00.000Z",
        end: "2026-06-01T18:00:00.000Z",
        durationMinutes: 60,
      }),
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(2);
  });

  it("does not count cardio-only workout canonicals", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: "run-1",
        sourceId: "apple_health",
        start: "2026-06-01T07:00:00.000Z",
        end: "2026-06-01T07:30:00.000Z",
        sport: "running",
        durationMinutes: 30,
        distanceMeters: 5000,
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(0);
  });
});
