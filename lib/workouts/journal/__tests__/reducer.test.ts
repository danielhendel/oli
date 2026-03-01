import { reduceWorkoutSessionV1 } from "../reducer";
import type { WorkoutEventV1 } from "../types";

const base = {
  ownerUid: "u1",
  sessionId: "s1",
  deviceTimeZone: "America/New_York",
  source: "manual" as const,
};

function e(overrides: Partial<WorkoutEventV1>): WorkoutEventV1 {
  const event: WorkoutEventV1 = {
    kind: "workout_note_added",
    eventId: "e0",
    idempotencyKey: "k0",
    occurredAt: "2026-03-01T10:00:00.000Z",
    capturedAt: "2026-03-01T10:00:00.000Z",
    payload: { note: "x" },
    ...base,
    ...overrides,
  } as WorkoutEventV1;
  return event;
}

describe("reduceWorkoutSessionV1", () => {
  it("is deterministic: same events produce same output", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_exercise_added",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: { slotId: "slot1", exerciseId: "bench_press", position: 0 },
      }),
      e({
        kind: "strength_set_logged",
        eventId: "e2",
        idempotencyKey: "k2",
        payload: { setId: "set1", slotId: "slot1", ordinal: 1, reps: 8, loadKg: 60 },
      }),
      e({
        kind: "workout_session_state_changed",
        eventId: "e3",
        idempotencyKey: "k3",
        payload: { from: "draft", to: "active", reason: "user" },
      }),
    ];
    const a = reduceWorkoutSessionV1(events);
    const b = reduceWorkoutSessionV1(events);
    expect(a).toEqual(b);
  });

  it("applies set corrections deterministically without mutating original log", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_exercise_added",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: { slotId: "slot1", exerciseId: "deadlift", position: 0 },
      }),
      e({
        kind: "strength_set_logged",
        eventId: "e2",
        idempotencyKey: "k2",
        payload: { setId: "set1", slotId: "slot1", ordinal: 1, reps: 5, loadKg: 120 },
      }),
      e({
        kind: "strength_set_corrected",
        eventId: "e3",
        idempotencyKey: "k3",
        payload: { setId: "set1", patch: { reps: 6 }, correctionReason: "user_edit" },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0]!.sets).toHaveLength(1);
    expect(out.exercises[0]!.sets[0]!.reps).toBe(6);
    expect(out.exercises[0]!.sets[0]!.loadKg).toBe(120);
  });

  it("ignores events from other sessions (fail-closed)", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_exercise_added",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: { slotId: "slot1", exerciseId: "squat", position: 0 },
      }),
      {
        ...e({
          kind: "strength_set_logged",
          eventId: "e2",
          idempotencyKey: "k2",
          payload: { setId: "set1", slotId: "slot1", ordinal: 1, reps: 5, loadKg: 100 },
        }),
        sessionId: "OTHER",
      } as WorkoutEventV1,
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.exercises[0]!.sets).toHaveLength(0);
  });
});
