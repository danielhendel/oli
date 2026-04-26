import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SessionEngineError,
  createSessionDraft,
  startSession,
  completeSession,
  addExercise,
  logStrengthSet,
} from "../commands";
import { loadReducedSession } from "../selectors";

jest.mock("@react-native-async-storage/async-storage", () => {
  const mem = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => mem.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mem.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mem.delete(key);
    }),
    __TEST__clear: () => mem.clear(),
  };
});

function mkDeps() {
  let n = 0;
  return {
    deviceTimeZone: "America/New_York",
    nowIso: () => "2026-03-01T10:00:00.000Z",
    makeId: (prefix: string) => `${prefix}_${++n}`,
  };
}

describe("sessionEngine commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage as unknown as { __TEST__clear?: () => void }).__TEST__clear?.();
  });

  it("creates a session draft by writing an initial state event", async () => {
    const deps = mkDeps();
    const { sessionId } = await createSessionDraft("u1", deps);
    expect(sessionId).toBe("ws_1");
    expect(AsyncStorage.setItem).toHaveBeenCalled();

    const reduced = await loadReducedSession("u1", sessionId);
    expect(reduced.status).toBe("draft");
    expect(reduced.eventCount).toBe(1);
  });

  it("rejects invalid transitions (fail-closed)", async () => {
    const deps = mkDeps();
    const { sessionId } = await createSessionDraft("u1", deps);

    await startSession("u1", sessionId, deps);
    await completeSession("u1", sessionId, deps);

    await expect(startSession("u1", sessionId, deps)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    } satisfies Partial<SessionEngineError>);
  });

  it("addExercise persists optional imageUrl into reduced session", async () => {
    const deps = mkDeps();
    const { sessionId } = await createSessionDraft("u1", deps);
    await startSession("u1", sessionId, deps);
    await addExercise(
      "u1",
      sessionId,
      {
        exerciseId: "custom_u1_angled",
        position: 0,
        imageUrl: " https://cdn.example/i.jpg ",
      },
      deps,
    );
    const reduced = await loadReducedSession("u1", sessionId);
    expect(reduced.exercises[0]!.exerciseId).toBe("custom_u1_angled");
    expect(reduced.exercises[0]!.imageUrl).toBe("https://cdn.example/i.jpg");
  });

  it("can add an exercise then log a set; reducer sees it deterministically", async () => {
    const deps = mkDeps();
    const { sessionId } = await createSessionDraft("u1", deps);

    await startSession("u1", sessionId, deps);

    const { slotId } = await addExercise("u1", sessionId, { exerciseId: "bench_press", position: 0 }, deps);
    expect(slotId).toBe("slot_4"); // ws_1, wev_2, wev_3, slot_4 (by mkDeps counter)

    await logStrengthSet(
      "u1",
      sessionId,
      { slotId, ordinal: 1, reps: 8, loadKg: 60 },
      deps,
    );

    const reduced = await loadReducedSession("u1", sessionId);
    expect(reduced.exercises).toHaveLength(1);
    expect(reduced.exercises[0]!.sets).toHaveLength(1);
    expect(reduced.exercises[0]!.sets[0]!.reps).toBe(8);
    expect(reduced.exercises[0]!.sets[0]!.loadKg).toBe(60);
  });

  it("startSession with anchorOccurredAt sets reducer startedAt to anchor", async () => {
    const deps = mkDeps();
    const { sessionId } = await createSessionDraft("u1", deps);
    await startSession("u1", sessionId, deps, { anchorOccurredAt: "2026-03-18T15:30:00.000Z" });
    const reduced = await loadReducedSession("u1", sessionId);
    expect(reduced.startedAt).toBe("2026-03-18T15:30:00.000Z");
    expect(reduced.status).toBe("active");
  });

  it("backfill anchor in the past leaves session active (occurredAt order) and completeSession succeeds", async () => {
    const deps = mkDeps();
    const { sessionId } = await createSessionDraft("u1", deps);
    await startSession("u1", sessionId, deps, { anchorOccurredAt: "2024-06-01T12:00:00.000Z" });
    const activeReduced = await loadReducedSession("u1", sessionId);
    expect(activeReduced.status).toBe("active");
    expect(activeReduced.startedAt).toBe("2024-06-01T12:00:00.000Z");
    await completeSession("u1", sessionId, deps);
    const completed = await loadReducedSession("u1", sessionId);
    expect(completed.status).toBe("completed");
  });
});
