import { persistCompletedSessionToHistory } from "../finalize";

jest.mock("@/lib/workouts/sessionEngine/selectors", () => ({
  loadReducedSession: jest.fn(),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logStrengthWorkout: jest.fn(),
}));

jest.mock("@/lib/workouts/exercises/customExerciseStore", () => ({
  listCustomExercises: jest.fn(),
}));

jest.mock("@/lib/api/exerciseDefinitions", () => ({
  listExerciseDefinitions: jest.fn(),
}));

const selectors = require("@/lib/workouts/sessionEngine/selectors");
const usersMeApi = require("@/lib/api/usersMe");
const customExerciseStore = require("@/lib/workouts/exercises/customExerciseStore");
const exerciseDefinitionsApi = require("@/lib/api/exerciseDefinitions");

describe("persistCompletedSessionToHistory", () => {
  beforeEach(() => {
    selectors.loadReducedSession.mockReset();
    usersMeApi.logStrengthWorkout.mockReset();
    customExerciseStore.listCustomExercises.mockReset();
    customExerciseStore.listCustomExercises.mockResolvedValue([]);
    exerciseDefinitionsApi.listExerciseDefinitions.mockReset();
    exerciseDefinitionsApi.listExerciseDefinitions.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: { items: [] },
    });
  });

  it("persists completed journal session to strength_workout ingest payload", async () => {
    selectors.loadReducedSession.mockResolvedValue({
      ownerUid: "u1",
      sessionId: "s1",
      status: "completed",
      startedAt: "2026-03-27T10:00:00.000Z",
      blocks: [],
      notes: [],
      eventCount: 3,
      exercises: [
        {
          slotId: "slot1",
          blockId: null,
          exerciseId: "bench_press",
          position: 0,
          removed: false,
          sets: [
            {
              setId: "set1",
              ordinal: 1,
              reps: 5,
              loadKg: 100,
              rpe: 8,
              tempo: null,
              isWarmup: false,
              note: null,
              occurredAt: "2026-03-27T10:05:00.000Z",
            },
          ],
        },
      ],
    });
    usersMeApi.logStrengthWorkout.mockResolvedValue({
      ok: true,
      status: 202,
      requestId: null,
      json: { ok: true, rawEventId: "raw_evt_1", day: "2026-03-27" },
    });

    const out = await persistCompletedSessionToHistory("u1", "s1", "token-1");

    expect(out).toEqual({ kind: "written", rawEventId: "raw_evt_1", day: "2026-03-27" });
    expect(usersMeApi.logStrengthWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        startedAt: "2026-03-27T10:00:00.000Z",
        exercises: [
          expect.objectContaining({
            name: "Bench Press",
            exerciseId: "bench_press",
            sets: [expect.objectContaining({ reps: 5, load: 100, unit: "kg", rpe: 8 })],
          }),
        ],
      }),
      "token-1",
    );
  });

  it("uses custom exercise name when exercise is not in catalog", async () => {
    selectors.loadReducedSession.mockResolvedValue({
      ownerUid: "u1",
      sessionId: "s1",
      status: "completed",
      startedAt: "2026-03-27T10:00:00.000Z",
      blocks: [],
      notes: [],
      eventCount: 3,
      exercises: [
        {
          slotId: "slot1",
          blockId: null,
          exerciseId: "custom_u1_my_special_press",
          position: 0,
          removed: false,
          sets: [
            {
              setId: "set1",
              ordinal: 1,
              reps: 6,
              loadKg: 40,
              rpe: null,
              tempo: null,
              isWarmup: false,
              note: null,
              occurredAt: "2026-03-27T10:05:00.000Z",
            },
          ],
        },
      ],
    });
    customExerciseStore.listCustomExercises.mockResolvedValue([
      {
        exerciseId: "custom_u1_my_special_press",
        name: "My Special Press",
        equipment: "Dumbbell",
        primary: "Chest",
        loggingType: "weight_reps",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    ]);
    usersMeApi.logStrengthWorkout.mockResolvedValue({
      ok: true,
      status: 202,
      requestId: null,
      json: { ok: true, rawEventId: "raw_evt_2", day: "2026-03-27" },
    });

    await persistCompletedSessionToHistory("u1", "s1", "token-1");

    expect(usersMeApi.logStrengthWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            name: "My Special Press",
            exerciseId: "custom_u1_my_special_press",
          }),
        ],
      }),
      "token-1",
    );
  });

  it("includes displayName from journal name: note in ingest payload", async () => {
    selectors.loadReducedSession.mockResolvedValue({
      ownerUid: "u1",
      sessionId: "s1",
      status: "completed",
      startedAt: "2026-03-27T10:00:00.000Z",
      blocks: [],
      notes: ["name:Push Day"],
      eventCount: 3,
      exercises: [
        {
          slotId: "slot1",
          blockId: null,
          exerciseId: "bench_press",
          position: 0,
          removed: false,
          sets: [
            {
              setId: "set1",
              ordinal: 1,
              reps: 5,
              loadKg: 100,
              rpe: 8,
              tempo: null,
              isWarmup: false,
              note: null,
              occurredAt: "2026-03-27T10:05:00.000Z",
            },
          ],
        },
      ],
    });
    usersMeApi.logStrengthWorkout.mockResolvedValue({
      ok: true,
      status: 202,
      requestId: null,
      json: { ok: true, rawEventId: "raw_evt_3", day: "2026-03-27" },
    });

    await persistCompletedSessionToHistory("u1", "s1", "token-1");

    expect(usersMeApi.logStrengthWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Push Day",
        startedAt: "2026-03-27T10:00:00.000Z",
      }),
      "token-1",
    );
  });

  it("returns skipped_no_sets and skips ingest when there are no logged sets", async () => {
    selectors.loadReducedSession.mockResolvedValue({
      ownerUid: "u1",
      sessionId: "s1",
      status: "completed",
      startedAt: "2026-03-27T10:00:00.000Z",
      blocks: [],
      notes: [],
      eventCount: 2,
      exercises: [
        {
          slotId: "slot1",
          blockId: null,
          exerciseId: "bench_press",
          position: 0,
          removed: false,
          sets: [],
        },
      ],
    });

    const out = await persistCompletedSessionToHistory("u1", "s1", "token-1");

    expect(out).toEqual({ kind: "skipped_no_sets" });
    expect(usersMeApi.logStrengthWorkout).not.toHaveBeenCalled();
  });

  it("throws when ingest fails", async () => {
    selectors.loadReducedSession.mockResolvedValue({
      ownerUid: "u1",
      sessionId: "s1",
      status: "completed",
      startedAt: "2026-03-27T10:00:00.000Z",
      blocks: [],
      notes: [],
      eventCount: 2,
      exercises: [
        {
          slotId: "slot1",
          blockId: null,
          exerciseId: "bench_press",
          position: 0,
          removed: false,
          sets: [
            {
              setId: "set1",
              ordinal: 1,
              reps: 5,
              loadKg: 100,
              rpe: null,
              tempo: null,
              isWarmup: false,
              note: null,
              occurredAt: "2026-03-27T10:05:00.000Z",
            },
          ],
        },
      ],
    });
    usersMeApi.logStrengthWorkout.mockResolvedValue({
      ok: false,
      status: 500,
      requestId: "req_123",
      error: "boom",
    });

    await expect(persistCompletedSessionToHistory("u1", "s1", "token-1")).rejects.toThrow(
      "boom",
    );
  });
});
