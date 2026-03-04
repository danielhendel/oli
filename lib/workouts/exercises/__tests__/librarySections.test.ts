import { buildExerciseLibrarySections } from "../librarySections";

jest.mock("@/lib/workouts/journal/sessionIndex", () => ({
  listWorkoutJournalSessionIds: jest.fn(async () => ["s1", "s2"]),
}));

jest.mock("@/lib/workouts/journal/store", () => ({
  listWorkoutJournalEvents: jest.fn(async (_uid: string, sid: string) => {
    if (sid === "s1") {
      return [
        {
          kind: "workout_session_state_changed",
          eventId: "e1",
          ownerUid: "u1",
          sessionId: "s1",
          occurredAt: "2026-03-01T10:00:00.000Z",
          capturedAt: "2026-03-01T10:00:00.000Z",
          deviceTimeZone: "America/New_York",
          source: "manual",
          idempotencyKey: "k1",
          payload: { from: "draft", to: "completed", reason: "user" },
        },
        {
          kind: "workout_exercise_added",
          eventId: "e2",
          ownerUid: "u1",
          sessionId: "s1",
          occurredAt: "2026-03-01T10:01:00.000Z",
          capturedAt: "2026-03-01T10:01:00.000Z",
          deviceTimeZone: "America/New_York",
          source: "manual",
          idempotencyKey: "k2",
          payload: { slotId: "slot1", exerciseId: "bench_press", position: 0 },
        },
        {
          kind: "strength_set_logged",
          eventId: "e3",
          ownerUid: "u1",
          sessionId: "s1",
          occurredAt: "2026-03-01T10:02:00.000Z",
          capturedAt: "2026-03-01T10:02:00.000Z",
          deviceTimeZone: "America/New_York",
          source: "manual",
          idempotencyKey: "k3",
          payload: { setId: "set1", slotId: "slot1", ordinal: 1, reps: 8, loadKg: 60 },
        },
      ];
    }
    return [
      {
        kind: "workout_session_state_changed",
        eventId: "e4",
        ownerUid: "u1",
        sessionId: "s2",
        occurredAt: "2026-03-02T10:00:00.000Z",
        capturedAt: "2026-03-02T10:00:00.000Z",
        deviceTimeZone: "America/New_York",
        source: "manual",
        idempotencyKey: "k4",
        payload: { from: "draft", to: "completed", reason: "user" },
      },
      {
        kind: "workout_exercise_added",
        eventId: "e5",
        ownerUid: "u1",
        sessionId: "s2",
        occurredAt: "2026-03-02T10:01:00.000Z",
        capturedAt: "2026-03-02T10:01:00.000Z",
        deviceTimeZone: "America/New_York",
        source: "manual",
        idempotencyKey: "k5",
        payload: { slotId: "slot2", exerciseId: "squat", position: 0 },
      },
      {
        kind: "strength_set_logged",
        eventId: "e6",
        ownerUid: "u1",
        sessionId: "s2",
        occurredAt: "2026-03-02T10:02:00.000Z",
        capturedAt: "2026-03-02T10:02:00.000Z",
        deviceTimeZone: "America/New_York",
        source: "manual",
        idempotencyKey: "k6",
        payload: { setId: "set2", slotId: "slot2", ordinal: 1, reps: 5, loadKg: 70 },
      },
    ];
  }),
}));

describe("buildExerciseLibrarySections", () => {
  it("returns recentIds by last performed and popularIds by session count (deterministic)", async () => {
    const out = await buildExerciseLibrarySections("u1", { recentLimit: 6, popularLimit: 6 });
    expect(out.recentIds).toContain("squat"); // s2 is later
    expect(out.recentIds).toContain("bench_press");
    expect(out.recentIds[0]).toBe("squat"); // last performed (s2 2026-03-02) before bench_press (s1 2026-03-01)
    expect(out.popularIds).toContain("bench_press");
    expect(out.popularIds).toContain("squat");
    expect(out.recentIds.length).toBe(2);
    expect(out.popularIds.length).toBe(2);
  });

  it("respects recentLimit and popularLimit", async () => {
    const out = await buildExerciseLibrarySections("u1", { recentLimit: 1, popularLimit: 1 });
    expect(out.recentIds.length).toBe(1);
    expect(out.popularIds.length).toBe(1);
  });
});
