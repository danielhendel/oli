/**
 * Pure shared workout session reconciliation contracts (synthetic data only).
 */
import {
  familyFromWorkoutKind,
  reconcileWorkoutSessionsCore,
  type ReconcilableWorkoutRecord,
} from "@/lib/domain/workouts/reconcileWorkoutSessionsCore";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

function record(
  overrides: Partial<ReconcilableWorkoutRecord> & Pick<ReconcilableWorkoutRecord, "id" | "family">,
): ReconcilableWorkoutRecord {
  return {
    sourceId: overrides.sourceId ?? "apple_health",
    title: overrides.title ?? null,
    start: overrides.start ?? "2026-07-16T18:00:00.000Z",
    end: overrides.end ?? "2026-07-16T19:00:00.000Z",
    observedAt: overrides.observedAt ?? overrides.start ?? "2026-07-16T18:00:00.000Z",
    durationMinutes: overrides.durationMinutes ?? 60,
    calories: overrides.calories ?? null,
    rawKind: overrides.rawKind ?? null,
    ...overrides,
  };
}

function historyItem(
  overrides: Partial<WorkoutHistoryItem> & Pick<WorkoutHistoryItem, "id">,
): WorkoutHistoryItem {
  return {
    observedAt: overrides.observedAt ?? "2026-07-16T18:00:00.000Z",
    sourceId: overrides.sourceId ?? "apple_health",
    title: overrides.title ?? "Workout",
    start: overrides.start ?? "2026-07-16T18:00:00.000Z",
    end: overrides.end ?? "2026-07-16T19:00:00.000Z",
    durationMinutes: overrides.durationMinutes ?? 60,
    calories: overrides.calories ?? null,
    ...overrides,
  };
}

describe("reconcileWorkoutSessionsCore", () => {
  test("manual-only → one session", () => {
    const sessions = reconcileWorkoutSessionsCore("2026-07-16", [
      record({
        id: "m1",
        sourceId: "manual",
        family: "strength",
        rawKind: "strength_workout",
        title: "Push",
      }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.memberIds).toEqual(["m1"]);
  });

  test("Apple Health-only → one session", () => {
    const sessions = reconcileWorkoutSessionsCore("2026-07-16", [
      record({ id: "a1", family: "unknown", rawKind: "workout" }),
    ]);
    expect(sessions).toHaveLength(1);
  });

  test("matching manual + Apple Health → one merged session", () => {
    // Legacy manual strength often has start===end and null duration — must still merge.
    const sessions = reconcileWorkoutSessionsCore("2026-07-16", [
      record({
        id: "m1",
        sourceId: "manual",
        family: "strength",
        rawKind: "strength_workout",
        title: "Legs",
        start: "2026-07-16T18:00:00.000Z",
        end: "2026-07-16T18:00:00.000Z",
        durationMinutes: null,
      }),
      record({
        id: "a1",
        family: "unknown",
        rawKind: "workout",
        start: "2026-07-16T18:02:00.000Z",
        end: "2026-07-16T19:00:00.000Z",
        durationMinutes: 58,
      }),
    ]);
    expect(sessions).toHaveLength(1);
    expect([...sessions[0]!.memberIds].sort()).toEqual(["a1", "m1"]);
    expect(sessions[0]!.title).toBe("Legs");
    expect(sessions[0]!.titleSource).toBe("manual");
  });

  test("strength_workout + workout kinds merge when times align", () => {
    const sessions = reconcileWorkoutSessionsCore("2026-07-16", [
      record({
        id: "s1",
        sourceId: "manual",
        family: familyFromWorkoutKind("strength_workout"),
        rawKind: "strength_workout",
        start: "2026-07-16T18:00:00.000Z",
        end: "2026-07-16T18:00:00.000Z",
        durationMinutes: null,
      }),
      record({
        id: "w1",
        family: familyFromWorkoutKind("workout"),
        rawKind: "workout",
        start: "2026-07-16T18:10:00.000Z",
        end: "2026-07-16T19:00:00.000Z",
      }),
    ]);
    expect(sessions).toHaveLength(1);
  });

  test("two distinct sessions close in time stay separate when families conflict", () => {
    const sessions = reconcileWorkoutSessionsCore("2026-07-16", [
      record({
        id: "s1",
        family: "strength",
        rawKind: "strength_workout",
        start: "2026-07-16T18:00:00.000Z",
        end: "2026-07-16T18:40:00.000Z",
      }),
      record({
        id: "c1",
        family: "cardio",
        start: "2026-07-16T18:05:00.000Z",
        end: "2026-07-16T18:45:00.000Z",
      }),
    ]);
    expect(sessions).toHaveLength(2);
  });

  test("same title on far-apart sessions → two sessions", () => {
    const sessions = reconcileWorkoutSessionsCore("2026-07-16", [
      record({
        id: "a",
        family: "unknown",
        title: "Run",
        start: "2026-07-16T07:00:00.000Z",
        end: "2026-07-16T07:30:00.000Z",
      }),
      record({
        id: "b",
        family: "unknown",
        title: "Run",
        start: "2026-07-16T18:00:00.000Z",
        end: "2026-07-16T18:30:00.000Z",
      }),
    ]);
    expect(sessions).toHaveLength(2);
  });

  test("source order does not change merged identity", () => {
    const a = record({
      id: "m1",
      sourceId: "manual",
      family: "strength",
      rawKind: "strength_workout",
      title: "Push",
      start: "2026-07-16T18:00:00.000Z",
      end: "2026-07-16T18:00:00.000Z",
      durationMinutes: null,
    });
    const b = record({
      id: "a1",
      family: "unknown",
      rawKind: "workout",
      start: "2026-07-16T18:05:00.000Z",
      end: "2026-07-16T19:00:00.000Z",
    });
    const forward = reconcileWorkoutSessionsCore("2026-07-16", [a, b]);
    const reverse = reconcileWorkoutSessionsCore("2026-07-16", [b, a]);
    expect(forward).toHaveLength(1);
    expect(reverse).toHaveLength(1);
    expect(forward[0]!.id).toBe(reverse[0]!.id);
  });
});

describe("Workout module wrapper parity with core", () => {
  test("same synthetic inputs yield one merged session with shared membership", () => {
    const day = "2026-07-16" as const;
    const manual = historyItem({
      id: "m1",
      sourceId: "manual",
      rawKind: "strength_workout",
      workoutType: "strength",
      title: "Push",
      start: "2026-07-16T18:00:00.000Z",
      end: "2026-07-16T18:00:00.000Z",
      durationMinutes: null,
    });
    const apple = historyItem({
      id: "a1",
      sourceId: "apple_health",
      rawKind: "workout",
      title: "Traditional Strength Training",
      start: "2026-07-16T18:02:00.000Z",
      end: "2026-07-16T19:00:00.000Z",
      durationMinutes: 58,
    });
    const workoutSessions = reconcileWorkoutSessionsForDay(day, [manual, apple]);
    const core = reconcileWorkoutSessionsCore(day, [
      {
        id: "m1",
        sourceId: "manual",
        rawKind: "strength_workout",
        title: "Push",
        start: "2026-07-16T18:00:00.000Z",
        end: "2026-07-16T18:00:00.000Z",
        durationMinutes: null,
        calories: null,
        family: "strength",
      },
      {
        id: "a1",
        sourceId: "apple_health",
        rawKind: "workout",
        title: "Traditional Strength Training",
        start: "2026-07-16T18:02:00.000Z",
        end: "2026-07-16T19:00:00.000Z",
        durationMinutes: 58,
        calories: null,
        family: "unknown",
      },
    ]);
    expect(workoutSessions).toHaveLength(1);
    expect(core).toHaveLength(1);
    expect(workoutSessions[0]!.workouts.map((w) => w.id).sort()).toEqual(
      [...core[0]!.memberIds].sort(),
    );
  });
});
