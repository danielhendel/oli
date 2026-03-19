import type { RawEventDoc } from "@oli/contracts";
import { parseWorkoutHistoryItem } from "../parseWorkoutFromRawEvent";

function minimalRaw(overrides: Partial<{ id: string; observedAt: string; receivedAt: string; sourceId: string; payload: unknown }>): RawEventDoc {
  return {
    schemaVersion: 1,
    id: "raw-1",
    userId: "user-1",
    sourceId: "source-1",
    provider: "manual",
    sourceType: "manual",
    kind: "workout",
    receivedAt: "2024-06-01T12:00:00Z",
    observedAt: "2024-06-01T11:00:00Z",
    payload: {},
    ...overrides,
  } as RawEventDoc;
}

describe("parseWorkoutHistoryItem", () => {
  it("full payload workout parses expected fields including hk", () => {
    const raw = minimalRaw({
      id: "ev-1",
      observedAt: "2024-06-01T10:00:00Z",
      sourceId: "apple_health",
      payload: {
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:30:00Z",
        sport: "Running",
        durationMinutes: 90,
        calories: 450,
        hk: { sourceId: "HK", activityId: 12345 },
      },
    });
    const item = parseWorkoutHistoryItem(raw);
    expect(item.id).toBe("ev-1");
    expect(item.observedAt).toBe("2024-06-01T10:00:00Z");
    expect(item.sourceId).toBe("apple_health");
    expect(item.title).toBe("Running");
    expect(item.start).toBe("2024-06-01T10:00:00Z");
    expect(item.end).toBe("2024-06-01T11:30:00Z");
    expect(item.durationMinutes).toBe(90);
    expect(item.calories).toBe(450);
    expect(item.hk).toEqual({ sourceId: "HK", activityId: 12345 });
  });

  it("payload.name wins over sport for display title", () => {
    const raw = minimalRaw({
      id: "ev-name",
      observedAt: "2024-06-03T09:00:00Z",
      payload: {
        name: "Leg day template",
        sport: "Running",
        start: "2024-06-03T09:00:00Z",
        end: "2024-06-03T10:00:00Z",
        durationMinutes: 60,
      },
    });
    expect(parseWorkoutHistoryItem(raw).title).toBe("Leg day template");
  });

  it("strength_workout uses first exercise name as title", () => {
    const raw = minimalRaw({
      id: "ev-str",
      kind: "strength_workout",
      observedAt: "2024-06-04T10:00:00Z",
      payload: {
        startedAt: "2024-06-04T10:00:00Z",
        timeZone: "UTC",
        exercises: [{ name: "Deadlift", sets: [{ reps: 5, load: 100, unit: "kg" as const }] }],
      },
    } as RawEventDoc);
    const item = parseWorkoutHistoryItem(raw);
    expect(item.title).toBe("Deadlift");
    expect(item.start).toBe("2024-06-04T10:00:00Z");
  });

  it("strength_workout without exercise names falls back to Strength workout", () => {
    const raw = minimalRaw({
      id: "ev-str2",
      kind: "strength_workout",
      observedAt: "2024-06-05T10:00:00Z",
      payload: {
        startedAt: "2024-06-05T10:00:00Z",
        timeZone: "UTC",
        exercises: [],
      },
    } as RawEventDoc);
    expect(parseWorkoutHistoryItem(raw).title).toBe("Strength workout");
  });

  it("missing payload returns fallback without throw", () => {
    const raw = minimalRaw({
      id: "ev-2",
      observedAt: "2024-06-02T09:00:00Z",
      payload: {},
    });
    const item = parseWorkoutHistoryItem(raw);
    expect(item.id).toBe("ev-2");
    expect(item.observedAt).toBe("2024-06-02T09:00:00Z");
    expect(item.title).toBe("Workout");
    expect(item.start).toBe("2024-06-02T09:00:00Z");
    expect(item.end).toBeNull();
    expect(item.durationMinutes).toBeNull();
    expect(item.calories).toBeNull();
    expect(item.hk).toBeUndefined();
  });
});
