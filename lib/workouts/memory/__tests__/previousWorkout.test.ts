import {
  getPreviousExerciseComparison,
  formatPreviousSetDisplay,
} from "../previousWorkout";

jest.mock("@/lib/workouts/journal/sessionIndex", () => ({
  listWorkoutJournalSessionIds: jest.fn(),
}));

jest.mock("@/lib/workouts/journal/store", () => ({
  listWorkoutJournalEvents: jest.fn(),
}));

const sessionIndex = require("@/lib/workouts/journal/sessionIndex") as {
  listWorkoutJournalSessionIds: jest.Mock;
};
const store = require("@/lib/workouts/journal/store") as {
  listWorkoutJournalEvents: jest.Mock;
};

describe("previousWorkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatPreviousSetDisplay", () => {
    it("formats reps×weight without RPE", () => {
      expect(formatPreviousSetDisplay({ ordinal: 1, reps: 10, loadLb: 90 })).toBe("10×90");
    });

    it("formats reps×weight with RPE", () => {
      expect(formatPreviousSetDisplay({ ordinal: 1, reps: 8, loadLb: 135, rpe: 8 })).toBe("8×135 @8");
    });

    it("formats decimal weight", () => {
      expect(formatPreviousSetDisplay({ ordinal: 1, reps: 5, loadLb: 97.5 })).toBe("5×97.5");
    });

    it("returns empty string when no reps and no load", () => {
      expect(formatPreviousSetDisplay({ ordinal: 1 })).toBe("");
    });

    it("formats bodyweight when load missing or zero", () => {
      expect(formatPreviousSetDisplay({ ordinal: 1, reps: 10 })).toBe("10×BW");
    });
  });

  describe("getPreviousExerciseComparison", () => {
    it("returns empty when no sessions", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue([]);
      const got = await getPreviousExerciseComparison("u1", "bench_press");
      expect(got).toEqual({ summaryText: null, setsByOrdinal: {} });
    });

    it("returns last completed session sets for exercise keyed by ordinal", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue(["s1", "s2"]);
      store.listWorkoutJournalEvents.mockImplementation(async (_uid: string, sid: string) => {
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
              payload: { setId: "set1", slotId: "slot1", ordinal: 1, reps: 10, loadKg: 40.82 },
            },
            {
              kind: "strength_set_logged",
              eventId: "e4",
              ownerUid: "u1",
              sessionId: "s1",
              occurredAt: "2026-03-01T10:03:00.000Z",
              capturedAt: "2026-03-01T10:03:00.000Z",
              deviceTimeZone: "America/New_York",
              source: "manual",
              idempotencyKey: "k4",
              payload: { setId: "set2", slotId: "slot1", ordinal: 2, reps: 8, loadKg: 61.23, rpe: 8 },
            },
          ];
        }
        return [
          {
            kind: "workout_session_state_changed",
            eventId: "e5",
            ownerUid: "u1",
            sessionId: "s2",
            occurredAt: "2026-03-02T10:00:00.000Z",
            capturedAt: "2026-03-02T10:00:00.000Z",
            deviceTimeZone: "America/New_York",
            source: "manual",
            idempotencyKey: "k5",
            payload: { from: "draft", to: "active", reason: "user" },
          },
        ];
      });

      const got = await getPreviousExerciseComparison("u1", "bench_press");
      expect(got.summaryText).toMatch(/2 × 10 @/);
      expect(got.setsByOrdinal[1]).toEqual({
        ordinal: 1,
        reps: 10,
        loadLb: expect.any(Number),
      });
      expect(got.setsByOrdinal[2]).toEqual({
        ordinal: 2,
        reps: 8,
        loadLb: expect.any(Number),
        rpe: 8,
      });
    });

    it("skips non-completed sessions and uses most recent completed", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue(["s1", "s2"]);
      store.listWorkoutJournalEvents.mockImplementation(async (_uid: string, sid: string) => {
        if (sid === "s2") {
          return [
            {
              kind: "workout_session_state_changed",
              eventId: "e1",
              ownerUid: "u1",
              sessionId: "s2",
              occurredAt: "2026-03-02T10:00:00.000Z",
              capturedAt: "2026-03-02T10:00:00.000Z",
              deviceTimeZone: "America/New_York",
              source: "manual",
              idempotencyKey: "k1",
              payload: { from: "draft", to: "completed", reason: "user" },
            },
            {
              kind: "workout_exercise_added",
              eventId: "e2",
              ownerUid: "u1",
              sessionId: "s2",
              occurredAt: "2026-03-02T10:01:00.000Z",
              capturedAt: "2026-03-02T10:01:00.000Z",
              deviceTimeZone: "America/New_York",
              source: "manual",
              idempotencyKey: "k2",
              payload: { slotId: "slot2", exerciseId: "squat", position: 0 },
            },
            {
              kind: "strength_set_logged",
              eventId: "e3",
              ownerUid: "u1",
              sessionId: "s2",
              occurredAt: "2026-03-02T10:02:00.000Z",
              capturedAt: "2026-03-02T10:02:00.000Z",
              deviceTimeZone: "America/New_York",
              source: "manual",
              idempotencyKey: "k3",
              payload: { setId: "set1", slotId: "slot2", ordinal: 1, reps: 5, loadKg: 100 },
            },
          ];
        }
        return [];
      });

      const gotSquat = await getPreviousExerciseComparison("u1", "squat");
      expect(gotSquat.setsByOrdinal[1]?.reps).toBe(5);

      const gotBench = await getPreviousExerciseComparison("u1", "bench_press");
      expect(gotBench).toEqual({ summaryText: null, setsByOrdinal: {} });
    });
  });
});
