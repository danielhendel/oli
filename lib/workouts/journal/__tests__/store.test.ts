import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  appendWorkoutJournalEvent,
  listWorkoutJournalEvents,
  listPendingWorkoutJournalEventIds,
  markWorkoutJournalEventSent,
} from "../store";
import type { WorkoutEventV1 } from "../types";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function mkBase(overrides?: Partial<WorkoutEventV1>): WorkoutEventV1 {
  const base: WorkoutEventV1 = {
    kind: "workout_note_added",
    eventId: "e1",
    ownerUid: "u1",
    sessionId: "s1",
    occurredAt: "2026-03-01T10:00:00.000Z",
    capturedAt: "2026-03-01T10:00:00.000Z",
    deviceTimeZone: "America/New_York",
    source: "manual",
    idempotencyKey: "k1",
    payload: { note: "hello" },
  };
  return { ...base, ...(overrides ?? {}) } as WorkoutEventV1;
}

describe("workout journal store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("appends records under deterministic key", async () => {
    await appendWorkoutJournalEvent("u1", "s1", mkBase());
    const [key] = (AsyncStorage.setItem as unknown as jest.Mock).mock.calls[0]!;
    expect(String(key)).toContain("workouts:journal:v1:u:u1:s:s1:events");
  });

  it("append preserves prior records (append-only)", async () => {
    // seed existing record in storage
    const existing = JSON.stringify([{ v: 1, e: mkBase({ eventId: "e0", idempotencyKey: "k0" }) }]);
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(existing);
    await appendWorkoutJournalEvent("u1", "s1", mkBase({ eventId: "e1", idempotencyKey: "k1" }));

    const [, payload] = (AsyncStorage.setItem as unknown as jest.Mock).mock.calls[0]!;
    const arr = JSON.parse(String(payload)) as unknown[];
    expect(arr).toHaveLength(2);
  });

  it("list returns events and drops corrupted storage payload (fail-closed)", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce("not json");
    const events = await listWorkoutJournalEvents("u1", "s1");
    expect(events).toEqual([]);
  });

  it("tracks pending event ids and can mark sent", async () => {
    await appendWorkoutJournalEvent("u1", "s1", mkBase({ eventId: "e1" }));
    // pending stored at a separate key; we can only validate behavior via subsequent reads
    // seed pending list for read
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(JSON.stringify(["e1", "e2"]));
    const pending = await listPendingWorkoutJournalEventIds("u1");
    expect(pending).toEqual(["e1", "e2"]);

    // mark sent writes back a filtered list
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(JSON.stringify(["e1", "e2"]));
    await markWorkoutJournalEventSent("u1", "e1");
    const [, payload] = (AsyncStorage.setItem as unknown as jest.Mock).mock.calls.at(-1)!;
    expect(JSON.parse(String(payload))).toEqual(["e2"]);
  });
});
