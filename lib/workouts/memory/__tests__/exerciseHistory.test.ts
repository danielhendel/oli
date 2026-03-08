import { getExerciseHistory } from "../exerciseHistory";

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

const base = {
  ownerUid: "u1",
  sessionId: "s1",
  deviceTimeZone: "America/New_York",
  source: "manual" as const,
};

function completedSessionEvents(sessionId: string, exerciseId: string, sets: { ordinal: number; reps: number; loadKg: number; rpe?: number }[]) {
  const events: unknown[] = [
    {
      kind: "workout_session_state_changed",
      eventId: `e-${sessionId}-state`,
      ...base,
      sessionId,
      idempotencyKey: `k-${sessionId}-state`,
      occurredAt: "2026-03-01T10:00:00.000Z",
      capturedAt: "2026-03-01T10:00:00.000Z",
      payload: { from: "draft", to: "active", reason: "user" },
    },
    {
      kind: "workout_exercise_added",
      eventId: `e-${sessionId}-ex`,
      ...base,
      sessionId,
      idempotencyKey: `k-${sessionId}-ex`,
      occurredAt: "2026-03-01T10:01:00.000Z",
      capturedAt: "2026-03-01T10:01:00.000Z",
      payload: { slotId: `slot-${sessionId}`, exerciseId, position: 0 },
    },
    {
      kind: "workout_session_state_changed",
      eventId: `e-${sessionId}-done`,
      ...base,
      sessionId,
      idempotencyKey: `k-${sessionId}-done`,
      occurredAt: "2026-03-01T12:00:00.000Z",
      capturedAt: "2026-03-01T12:00:00.000Z",
      payload: { from: "active", to: "completed", reason: "user" },
    },
  ];
  sets.forEach((s, i) => {
    events.splice(events.length - 1, 0, {
      kind: "strength_set_logged",
      eventId: `e-${sessionId}-set-${i}`,
      ...base,
      sessionId,
      idempotencyKey: `k-${sessionId}-set-${i}`,
      occurredAt: `2026-03-01T10:0${2 + i}:00.000Z`,
      capturedAt: `2026-03-01T10:0${2 + i}:00.000Z`,
      payload: {
        setId: `set-${sessionId}-${i}`,
        slotId: `slot-${sessionId}`,
        ordinal: s.ordinal,
        reps: s.reps,
        loadKg: s.loadKg,
        ...(s.rpe != null ? { rpe: s.rpe } : {}),
      },
    });
  });
  return events;
}

describe("exerciseHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getExerciseHistory", () => {
    it("returns empty result when no sessions", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue([]);
      const got = await getExerciseHistory("u1", "bench_press");
      expect(got.sessions).toHaveLength(0);
      expect(got.summary.totalSessions).toBe(0);
      expect(got.summary.lastPerformedAt).toBeNull();
      expect(got.summary.bestE1RmKg).toBeNull();
      expect(got.summary.lastSummaryText).toBeNull();
    });

    it("returns one session with sets and summary when one completed session has exercise", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue(["s1"]);
      store.listWorkoutJournalEvents.mockResolvedValue(
        completedSessionEvents("s1", "bench_press", [
          { ordinal: 1, reps: 10, loadKg: 40 },
          { ordinal: 2, reps: 8, loadKg: 50, rpe: 8 },
        ]),
      );
      const got = await getExerciseHistory("u1", "bench_press");
      expect(got.sessions).toHaveLength(1);
      expect(got.sessions[0]!.sessionId).toBe("s1");
      expect(got.sessions[0]!.sets).toHaveLength(2);
      expect(got.sessions[0]!.volumeKg).toBe(10 * 40 + 8 * 50);
      expect(got.sessions[0]!.bestE1RmKg).not.toBeNull();
      // Epley: 40*(1+10/30) ≈ 53.33, 50*(1+8/30) ≈ 63.33 → max 63.33
      expect(got.sessions[0]!.bestE1RmKg).toBeCloseTo(50 * (1 + 8 / 30), 2);
      expect(got.summary.totalSessions).toBe(1);
      expect(got.summary.lastPerformedAt).toBeTruthy();
      expect(got.summary.lastSummaryText).toMatch(/2 × 10 @/);
      expect(got.summary.bestE1RmKg).toBeGreaterThan(0);
    });

    it("orders sessions newest first and each session has bestE1RmKg", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue(["s1", "s2", "s3"]);
      store.listWorkoutJournalEvents.mockImplementation(async (_uid: string, sid: string) => {
        if (sid === "s1")
          return completedSessionEvents("s1", "bench_press", [{ ordinal: 1, reps: 5, loadKg: 60 }]);
        if (sid === "s2")
          return completedSessionEvents("s2", "bench_press", [{ ordinal: 1, reps: 6, loadKg: 65 }]);
        if (sid === "s3")
          return completedSessionEvents("s3", "bench_press", [{ ordinal: 1, reps: 7, loadKg: 70 }]);
        return [];
      });
      const got = await getExerciseHistory("u1", "bench_press");
      expect(got.sessions).toHaveLength(3);
      expect(got.sessions[0]!.sessionId).toBe("s3");
      expect(got.sessions[1]!.sessionId).toBe("s2");
      expect(got.sessions[2]!.sessionId).toBe("s1");
      got.sessions.forEach((s) => {
        expect(s.bestE1RmKg).not.toBeNull();
        expect(typeof s.bestE1RmKg).toBe("number");
      });
      expect(got.sessions[0]!.bestE1RmKg).toBeCloseTo(70 * (1 + 7 / 30), 2);
      expect(got.sessions[2]!.bestE1RmKg).toBeCloseTo(60 * (1 + 5 / 30), 2);
    });

    it("skips sessions that do not contain the exercise", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue(["s1", "s2"]);
      store.listWorkoutJournalEvents.mockImplementation(async (_uid: string, sid: string) => {
        if (sid === "s1")
          return completedSessionEvents("s1", "deadlift", [{ ordinal: 1, reps: 5, loadKg: 100 }]);
        if (sid === "s2")
          return completedSessionEvents("s2", "bench_press", [{ ordinal: 1, reps: 8, loadKg: 60 }]);
        return [];
      });
      const got = await getExerciseHistory("u1", "bench_press");
      expect(got.sessions).toHaveLength(1);
      expect(got.sessions[0]!.sessionId).toBe("s2");
    });

    it("skips non-completed sessions", async () => {
      sessionIndex.listWorkoutJournalSessionIds.mockResolvedValue(["s1"]);
      store.listWorkoutJournalEvents.mockResolvedValue([
        {
          kind: "workout_session_state_changed",
          eventId: "e1",
          ...base,
          sessionId: "s1",
          idempotencyKey: "k1",
          occurredAt: "2026-03-01T10:00:00.000Z",
          capturedAt: "2026-03-01T10:00:00.000Z",
          payload: { from: "draft", to: "active", reason: "user" },
        },
        {
          kind: "workout_exercise_added",
          eventId: "e2",
          ...base,
          sessionId: "s1",
          idempotencyKey: "k2",
          occurredAt: "2026-03-01T10:01:00.000Z",
          capturedAt: "2026-03-01T10:01:00.000Z",
          payload: { slotId: "slot1", exerciseId: "bench_press", position: 0 },
        },
      ]);
      const got = await getExerciseHistory("u1", "bench_press");
      expect(got.sessions).toHaveLength(0);
      expect(got.summary.totalSessions).toBe(0);
    });
  });
});
