import type { RawEventDoc } from "@oli/contracts";
import {
  parseStrengthIngestExercisesFromPayload,
  parseWorkoutHistoryItem,
  resolveWorkoutIngestProvider,
  strengthWorkoutRowEligibleForDeleteFromOli,
} from "../parseWorkoutFromRawEvent";

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
  it("sets isDeletableRawEvent when hydrate opts in", () => {
    const raw = minimalRaw({
      id: "ev-1",
      provider: "manual",
      payload: {
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        sport: "Run",
        durationMinutes: 60,
      },
    });
    const item = parseWorkoutHistoryItem(raw, { isDeletableRawEvent: true });
    expect(item.isDeletableRawEvent).toBe(true);
    expect(strengthWorkoutRowEligibleForDeleteFromOli(item)).toBe(true);
  });

  it("strength delete eligibility is false without isDeletableRawEvent even for manual provider", () => {
    const raw = minimalRaw({
      id: "ev-1",
      provider: "manual",
      payload: {
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        sport: "Run",
        durationMinutes: 60,
      },
    });
    const item = parseWorkoutHistoryItem(raw);
    expect(item.isDeletableRawEvent).toBeUndefined();
    expect(strengthWorkoutRowEligibleForDeleteFromOli(item)).toBe(false);
  });

  it("uses authoritativeRawEventId when stored body id disagrees with Firestore doc ref (DELETE /ingest target)", () => {
    const raw = minimalRaw({
      id: "wrong-embedded-id",
      provider: "apple_health",
      sourceId: "healthkit",
      payload: {
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        sport: "Running",
        durationMinutes: 60,
      },
    });
    const item = parseWorkoutHistoryItem(raw, { authoritativeRawEventId: "appleHealth:v2:workout:abc" });
    expect(item.id).toBe("appleHealth:v2:workout:abc");
  });

  it("full payload workout parses expected fields including hk", () => {
    const raw = minimalRaw({
      id: "ev-1",
      provider: "apple_health",
      observedAt: "2024-06-01T10:00:00Z",
      sourceId: "healthkit",
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
    expect(item.provider).toBe("apple_health");
    expect(item.observedAt).toBe("2024-06-01T10:00:00Z");
    expect(item.sourceId).toBe("healthkit");
    expect(item.title).toBe("Running");
    expect(item.start).toBe("2024-06-01T10:00:00Z");
    expect(item.end).toBe("2024-06-01T11:30:00Z");
    expect(item.durationMinutes).toBe(90);
    expect(item.calories).toBe(450);
    expect(item.hk).toEqual({ sourceId: "HK", activityId: 12345 });
  });

  it("infers apple_health when GET /raw-events list omitted provider but sourceId is healthkit", () => {
    const raw = minimalRaw({
      provider: "",
      sourceId: "healthkit",
      payload: {
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:30:00Z",
        sport: "Traditional Strength Training",
        durationMinutes: 30,
      },
    }) as RawEventDoc;
    expect(resolveWorkoutIngestProvider(raw)).toBe("apple_health");
    expect(parseWorkoutHistoryItem(raw).provider).toBe("apple_health");
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

  it("strength_workout uses payload.displayName as title when present", () => {
    const raw = minimalRaw({
      id: "ev-str-dn",
      kind: "strength_workout",
      observedAt: "2024-06-04T10:00:00Z",
      payload: {
        startedAt: "2024-06-04T10:00:00Z",
        timeZone: "UTC",
        displayName: "Leg Day",
        exercises: [{ name: "Squat", sets: [{ reps: 5, load: 100, unit: "kg" as const }] }],
      },
    } as RawEventDoc);
    const item = parseWorkoutHistoryItem(raw);
    expect(item.title).toBe("Leg Day");
    expect(item.strengthIngestDisplayName).toBe("Leg Day");
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
    expect(item.strengthIngestDisplayName).toBeUndefined();
    expect(item.start).toBe("2024-06-04T10:00:00Z");
    expect(item.workoutType).toBe("strength");
    expect(item.strengthVolumeKg).toBeCloseTo(500, 5);
    expect(item.strengthIngestExercises).toHaveLength(1);
    expect(item.strengthIngestExercises![0]!.exerciseId).toBe("exercise:ingested:ev-str:0");
    expect(item.strengthIngestExercises![0]!.sets[0]!.weightKg).toBe(100);
    expect(item.strengthIngestExercises![0]!.sets[0]!.reps).toBe(5);
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

  it("classifies TraditionalStrengthTraining workout kind as strength", () => {
    const raw = minimalRaw({
      id: "ev-ts",
      kind: "workout",
      payload: {
        sport: "TraditionalStrengthTraining",
        start: "2024-06-05T10:00:00Z",
      },
    } as RawEventDoc);
    expect(parseWorkoutHistoryItem(raw).workoutType).toBe("strength");
  });

  it("classifies Strength Training title as strength", () => {
    const raw = minimalRaw({
      id: "ev-st",
      kind: "workout",
      payload: {
        name: "Strength Training",
      },
    } as RawEventDoc);
    expect(parseWorkoutHistoryItem(raw).workoutType).toBe("strength");
  });

  it("classifies Running as cardio", () => {
    const raw = minimalRaw({
      id: "ev-run",
      kind: "workout",
      payload: {
        sport: "Running",
      },
    } as RawEventDoc);
    expect(parseWorkoutHistoryItem(raw).workoutType).toBe("cardio");
  });

  it("parses optional averageHeartRateBpm from payload", () => {
    const raw = minimalRaw({
      id: "ev-hr",
      observedAt: "2024-06-10T08:00:00Z",
      payload: {
        sport: "Traditional Strength Training",
        start: "2024-06-10T08:00:00Z",
        end: "2024-06-10T09:00:00Z",
        durationMinutes: 50,
        averageHeartRateBpm: 108.4,
      },
    });
    const item = parseWorkoutHistoryItem(raw);
    expect(item.averageHeartRateBpm).toBe(108.4);
  });

  it("rejects non-positive averageHeartRateBpm", () => {
    const raw = minimalRaw({
      id: "ev-hr-bad",
      payload: { sport: "Running", averageHeartRateBpm: 0 },
    });
    expect(parseWorkoutHistoryItem(raw).averageHeartRateBpm).toBeUndefined();
  });

  it("parses optional distanceMeters and heartRateZoneMinutes from payload", () => {
    const raw = minimalRaw({
      id: "ev-zones",
      observedAt: "2024-06-10T08:00:00Z",
      payload: {
        sport: "Running",
        start: "2024-06-10T08:00:00Z",
        end: "2024-06-10T09:00:00Z",
        durationMinutes: 60,
        distanceKm: 10.5,
        heartRateZoneMinutes: [5, 10, 15, 8, 2],
      },
    });
    const item = parseWorkoutHistoryItem(raw);
    expect(item.distanceMeters).toBeCloseTo(10500, 5);
    expect(item.heartRateZoneMinutes).toEqual([5, 10, 15, 8, 2]);
  });

  it("rejects heartRateZoneMinutes when not exactly five finite nonnegative numbers", () => {
    const raw = minimalRaw({
      id: "ev-bad-zones",
      payload: {
        sport: "Running",
        heartRateZoneMinutes: [1, 2, 3],
      },
    });
    expect(parseWorkoutHistoryItem(raw).heartRateZoneMinutes).toBeUndefined();
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
    expect(item.title).toBe("");
    expect(item.workoutType).toBeUndefined();
    expect(item.start).toBe("2024-06-02T09:00:00Z");
    expect(item.end).toBeNull();
    expect(item.durationMinutes).toBeNull();
    expect(item.calories).toBeNull();
    expect(item.hk).toBeUndefined();
  });
});

describe("parseStrengthIngestExercisesFromPayload", () => {
  it("uses synthetic exerciseId when payload has no exerciseId (legacy)", () => {
    const out = parseStrengthIngestExercisesFromPayload("raw-abc", {
      exercises: [
        {
          name: "Bench Press",
          sets: [{ reps: 5, load: 60, unit: "kg" }],
        },
      ],
    });
    expect(out).toBeDefined();
    expect(out![0]!.exerciseId).toBe("exercise:ingested:raw-abc:0");
    expect(out![0]!.name).toBe("Bench Press");
  });

  it("preserves stable exerciseId from payload when present", () => {
    const out = parseStrengthIngestExercisesFromPayload("raw-xyz", {
      exercises: [
        {
          name: "Bench Press",
          exerciseId: "bench_press",
          sets: [{ reps: 5, load: 60, unit: "kg" }],
        },
      ],
    });
    expect(out![0]!.exerciseId).toBe("bench_press");
    expect(out![0]!.name).toBe("Bench Press");
  });
});
