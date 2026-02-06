// services/functions/src/normalization/__tests__/mapRawEventToCanonical.test.ts
import { describe, it, expect } from "@jest/globals";
import type { RawEvent, CanonicalEvent } from "../../types/health";
import { mapRawEventToCanonical } from "../mapRawEventToCanonical";

const baseRawEvent: Omit<RawEvent, "id" | "payload" | "kind" | "provider"> = {
  userId: "user_123",
  sourceId: "source_manual_1",
  sourceType: "manual",
  receivedAt: "2025-01-01T12:00:00.000Z",
  observedAt: "2025-01-01T06:00:00.000Z",
  schemaVersion: 1,
};

describe("mapRawEventToCanonical", () => {
  it("maps manual sleep payload to SleepCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_sleep_1",
      provider: "manual",
      kind: "sleep",
      payload: {
        start: "2025-01-01T22:00:00.000Z",
        end: "2025-01-02T06:00:00.000Z",
        timezone: "America/New_York",
        totalMinutes: 480,
        efficiency: 0.9,
        latencyMinutes: 15,
        awakenings: 2,
        isMainSleep: true,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.id).toBe(raw.id);
    expect(canonical.userId).toBe(raw.userId);
    expect(canonical.sourceId).toBe(raw.sourceId);
    expect(canonical.kind).toBe("sleep");
    expect(canonical.start).toBe("2025-01-01T22:00:00.000Z");
    expect(canonical.end).toBe("2025-01-02T06:00:00.000Z");
    expect(canonical.day).toBe("2025-01-01");
    expect(canonical.timezone).toBe("America/New_York");
    expect(canonical.createdAt).toBe(raw.receivedAt);
    expect(canonical.updatedAt).toBe(raw.receivedAt);
    expect(canonical.schemaVersion).toBe(1);

    if (canonical.kind !== "sleep") throw new Error("Expected sleep kind");
    const sleep = canonical as Extract<CanonicalEvent, { kind: "sleep" }>;
    expect(sleep.totalMinutes).toBe(480);
    expect(sleep.isMainSleep).toBe(true);
  });

  it("maps manual steps payload to StepsCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_steps_1",
      provider: "manual",
      kind: "steps",
      payload: {
        start: "2025-01-01T08:00:00.000Z",
        end: "2025-01-01T21:00:00.000Z",
        timezone: "America/New_York",
        steps: 12000,
        distanceKm: 8.4,
        moveMinutes: 90,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.kind).toBe("steps");
    expect(canonical.day).toBe("2025-01-01");

    const stepsEvent = canonical as Extract<CanonicalEvent, { kind: "steps" }>;
    expect(stepsEvent.steps).toBe(12000);
    expect(stepsEvent.distanceKm).toBe(8.4);
    expect(stepsEvent.moveMinutes).toBe(90);
  });

  it("maps manual weight payload to WeightCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_weight_1",
      provider: "manual",
      kind: "weight",
      payload: {
        time: "2025-01-01T06:00:00.000Z",
        timezone: "America/New_York",
        weightKg: 73.482,
        bodyFatPercent: null,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.kind).toBe("weight");
    expect(canonical.day).toBe("2025-01-01");

    const weightEvent = canonical as Extract<CanonicalEvent, { kind: "weight" }>;
    expect(weightEvent.weightKg).toBe(73.482);
    expect(
      "bodyFatPercent" in weightEvent ? weightEvent.bodyFatPercent : undefined,
    ).toBeNull();
  });

  it("returns failure for unsupported provider", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_oura_1",
      provider: "oura",
      kind: "sleep",
      payload: {} as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure");
    expect(result.reason).toBe("UNSUPPORTED_PROVIDER");
  });

  it("returns failure for malformed manual payload", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_bad_1",
      provider: "manual",
      kind: "sleep",
      payload: {
        isMainSleep: true,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure");
    expect(result.reason).toBe("MALFORMED_PAYLOAD");
  });

  it("treats upload.file as memory-only (no canonical output)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_upload_1",
      provider: "manual",
      kind: "upload.file",
      payload: {
        storagePath: "users/user_123/uploads/abc.pdf",
        fileHash: "sha256:deadbeef",
        mimeType: "application/pdf",
        originalFilename: "labs.pdf",
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure (no-op)");
    expect(result.reason).toBe("UNSUPPORTED_KIND");
    expect(result.details).toEqual(
      expect.objectContaining({
        kind: "upload.file",
        memoryOnly: true,
        rawEventId: "raw_upload_1",
      }),
    );
  });

  it("maps valid strength_workout payload to StrengthWorkoutCanonicalEvent and derives day", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_strength_1",
      provider: "manual",
      kind: "strength_workout",
      payload: {
        startedAt: "2025-01-01T18:00:00.000Z",
        timeZone: "America/New_York",
        exercises: [
          {
            name: "Bench Press",
            sets: [
              { reps: 10, load: 135, unit: "lb" },
              { reps: 8, load: 155, unit: "lb", rpe: 8 },
            ],
          },
          {
            name: "Squat",
            sets: [{ reps: 5, load: 100, unit: "kg", isWarmup: true }],
          },
        ],
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.id).toBe(raw.id);
    expect(canonical.userId).toBe(raw.userId);
    expect(canonical.sourceId).toBe(raw.sourceId);
    expect(canonical.kind).toBe("strength_workout");
    expect(canonical.start).toBe("2025-01-01T18:00:00.000Z");
    expect(canonical.end).toBe("2025-01-01T18:00:00.000Z");
    expect(canonical.day).toBe("2025-01-01");
    expect(canonical.timezone).toBe("America/New_York");
    expect(canonical.createdAt).toBe(raw.receivedAt);
    expect(canonical.updatedAt).toBe(raw.receivedAt);
    expect(canonical.schemaVersion).toBe(1);

    if (canonical.kind !== "strength_workout") throw new Error("Expected strength_workout kind");
    const strength = canonical as Extract<CanonicalEvent, { kind: "strength_workout" }>;
    expect(strength.exercises).toHaveLength(3);
    expect(strength.exercises[0]).toEqual({
      exercise: "Bench Press",
      reps: 10,
      load: 135,
      unit: "lb",
    });
    expect(strength.exercises[1]).toEqual({
      exercise: "Bench Press",
      reps: 8,
      load: 155,
      unit: "lb",
      rpe: 8,
    });
    expect(strength.exercises[2]).toEqual({
      exercise: "Squat",
      reps: 5,
      load: 100,
      unit: "kg",
      isWarmup: true,
    });
  });

  it("returns ok:false MALFORMED_PAYLOAD for invalid strength_workout payload", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_strength_bad",
      provider: "manual",
      kind: "strength_workout",
      payload: {
        startedAt: "2025-01-01T18:00:00.000Z",
        timeZone: "America/New_York",
        exercises: [], // non-empty required
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure");
    expect(result.reason).toBe("MALFORMED_PAYLOAD");
  });

  it("derives canonical day using Intl.DateTimeFormat('en-CA', { timeZone }) across boundary conditions", () => {
    const cases: {
      name: string;
      start: string;
      end: string;
      timeZone: string;
      expectedDay: string;
    }[] = [
      {
        name: "America/New_York near midnight",
        start: "2024-01-02T04:59:00.000Z",
        end: "2024-01-02T05:09:00.000Z",
        timeZone: "America/New_York",
        expectedDay: "2024-01-01",
      },
      {
        name: "Asia/Tokyo non-US timezone",
        start: "2024-06-01T15:00:00.000Z",
        end: "2024-06-01T16:00:00.000Z",
        timeZone: "Asia/Tokyo",
        expectedDay: "2024-06-02",
      },
      {
        name: "America/New_York DST transition",
        start: "2024-03-10T06:59:00.000Z",
        end: "2024-03-10T08:10:00.000Z",
        timeZone: "America/New_York",
        expectedDay: "2024-03-10",
      },
    ];

    for (const c of cases) {
      const raw: RawEvent = {
        ...baseRawEvent,
        id: `raw_sleep_day_${c.expectedDay}`,
        provider: "manual",
        kind: "sleep",
        payload: {
          start: c.start,
          end: c.end,
          timezone: c.timeZone,
          totalMinutes: 60,
          isMainSleep: true,
        } as unknown,
      };

      const result = mapRawEventToCanonical(raw);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`Expected mapping success: ${c.name}`);

      const expected = new Intl.DateTimeFormat("en-CA", {
        timeZone: c.timeZone,
      }).format(new Date(c.start));

      expect(expected).toBe(c.expectedDay);
      expect(result.canonical.day).toBe(c.expectedDay);
    }
  });
});