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

  it("uses sessionStartedAtAnchorIso for startedAt while occurredAt follows wall-clock order after draft seed", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_session_state_changed",
        eventId: "e_draft",
        idempotencyKey: "k_draft",
        occurredAt: "2026-03-01T10:00:00.000Z",
        capturedAt: "2026-03-01T10:00:00.000Z",
        payload: { from: "draft", to: "draft", reason: "system" },
      }),
      e({
        kind: "workout_session_state_changed",
        eventId: "e_active",
        idempotencyKey: "k_active",
        occurredAt: "2026-03-01T10:00:01.000Z",
        capturedAt: "2026-03-01T10:00:01.000Z",
        payload: {
          from: "draft",
          to: "active",
          reason: "user",
          sessionStartedAtAnchorIso: "2024-06-15T15:30:00.000Z",
        },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.status).toBe("active");
    expect(out.startedAt).toBe("2024-06-15T15:30:00.000Z");
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

  it("preserves blockId from workout_exercise_added in reduced exercises", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_exercise_added",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: {
          slotId: "slot1",
          exerciseId: "bench_press",
          position: 0,
          blockId: "block:work",
        },
      }),
      e({
        kind: "workout_exercise_added",
        eventId: "e2",
        idempotencyKey: "k2",
        payload: {
          slotId: "slot2",
          exerciseId: "squat",
          position: 1,
          blockId: "block:warmup",
        },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.exercises).toHaveLength(2);
    expect(out.exercises[0]!.blockId).toBe("block:work");
    expect(out.exercises[1]!.blockId).toBe("block:warmup");
  });

  it("drops sets when strength_set_removed is applied", () => {
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
        kind: "strength_set_logged",
        eventId: "e3",
        idempotencyKey: "k3",
        payload: { setId: "set2", slotId: "slot1", ordinal: 2, reps: 5, loadKg: 120 },
      }),
      e({
        kind: "strength_set_removed",
        eventId: "e4",
        idempotencyKey: "k4",
        payload: { setId: "set1", reason: "user" },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0]!.sets).toHaveLength(1);
    expect(out.exercises[0]!.sets[0]!.setId).toBe("set2");
    expect(out.exercises[0]!.sets[0]!.ordinal).toBe(2);
  });

  it("workout_block_created produces blocks even with no exercises", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_block_created",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: {
          blockId: "block:sets:1",
          blockType: "sets",
          position: 0,
        },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0]!.blockId).toBe("block:sets:1");
    expect(out.blocks[0]!.blockType).toBe("sets");
    expect(out.blocks[0]!.position).toBe(0);
    expect(out.blocks[0]!.title).toBeDefined();
    expect(out.exercises).toHaveLength(0);
  });

  it("workout_block_updated changes blockType", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_block_created",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: {
          blockId: "block:sets:1",
          blockType: "sets",
          position: 0,
        },
      }),
      e({
        kind: "workout_block_updated",
        eventId: "e2",
        idempotencyKey: "k2",
        payload: {
          blockId: "block:sets:1",
          patch: { blockType: "superset" },
        },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0]!.blockId).toBe("block:sets:1");
    expect(out.blocks[0]!.blockType).toBe("superset");
    expect(out.blocks[0]!.removed).toBe(false);
  });

  it("workout_block_removed keeps block as tombstone with removed true", () => {
    const events: WorkoutEventV1[] = [
      e({
        kind: "workout_block_created",
        eventId: "e1",
        idempotencyKey: "k1",
        payload: {
          blockId: "block:sets:1",
          blockType: "sets",
          position: 0,
        },
      }),
      e({
        kind: "workout_block_removed",
        eventId: "e2",
        idempotencyKey: "k2",
        payload: { blockId: "block:sets:1" },
      }),
    ];
    const out = reduceWorkoutSessionV1(events);
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0]!.blockId).toBe("block:sets:1");
    expect(out.blocks[0]!.removed).toBe(true);
  });
});
