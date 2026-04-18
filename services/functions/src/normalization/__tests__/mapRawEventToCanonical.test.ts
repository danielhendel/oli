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

  it("maps apple_health steps payload to StepsCanonicalEvent (parity with HealthKit ingest)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_ah_steps_1",
      sourceId: "healthkit",
      provider: "apple_health",
      kind: "steps",
      payload: {
        start: "2025-01-01T05:00:00.000Z",
        end: "2025-01-02T04:59:59.999Z",
        timezone: "America/New_York",
        day: "2025-01-01",
        steps: 8421,
        sync: { mode: "range", anchorVersion: 1, anchorUsed: false },
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.kind).toBe("steps");
    expect(canonical.sourceId).toBe("healthkit");
    expect(canonical.day).toBe(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date("2025-01-01T05:00:00.000Z")),
    );
    const stepsEvent = canonical as Extract<CanonicalEvent, { kind: "steps" }>;
    expect(stepsEvent.steps).toBe(8421);
  });

  it("maps sampleId on apple_health steps payload to canonical sourceSampleId", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_ah_steps_sample",
      sourceId: "healthkit",
      provider: "apple_health",
      kind: "steps",
      payload: {
        start: "2025-01-01T05:00:00.000Z",
        end: "2025-01-02T04:59:59.999Z",
        timezone: "America/New_York",
        steps: 100,
        sampleId: "  hk-uuid-1  ",
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");
    const stepsEvent = result.canonical as Extract<CanonicalEvent, { kind: "steps" }>;
    expect(stepsEvent.sourceSampleId).toBe("hk-uuid-1");
  });

  it("apple_health steps: canonical day follows payload.start+timezone, not raw observedAt", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_ah_steps_drift",
      sourceId: "apple_health",
      provider: "apple_health",
      kind: "steps",
      observedAt: "2025-01-02T12:00:00.000Z",
      payload: {
        start: "2025-01-01T05:00:00.000Z",
        end: "2025-01-02T04:59:59.999Z",
        timezone: "America/New_York",
        day: "2099-12-31",
        steps: 100,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");
    const canonical = result.canonical as Extract<CanonicalEvent, { kind: "steps" }>;
    expect(canonical.day).toBe(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date("2025-01-01T05:00:00.000Z")),
    );
    expect(canonical.day).not.toBe("2099-12-31");
  });

  it("returns fact-only for weight (no canonical event, trigger recompute via onRawEventCreated)", () => {
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
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fact-only (no canonical)");
    expect(result.reason).toBe("UNSUPPORTED_KIND");
    expect(result.details).toEqual(
      expect.objectContaining({
        kind: "weight",
        factOnly: true,
        rawEventId: "raw_weight_1",
      }),
    );
  });

  it("returns fact-only for apple_health weight (not UNSUPPORTED_PROVIDER)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_ah_weight_1",
      provider: "apple_health",
      kind: "weight",
      payload: {
        time: "2025-01-01T06:00:00.000Z",
        timezone: "America/New_York",
        weightKg: 80,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fact-only (no canonical)");
    expect(result.reason).toBe("UNSUPPORTED_KIND");
    expect(result.details).toEqual(
      expect.objectContaining({
        kind: "weight",
        factOnly: true,
        rawEventId: "raw_ah_weight_1",
      }),
    );
  });

  it("returns fact-only for body_composition (no canonical event)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_body_comp_1",
      provider: "apple_health",
      kind: "body_composition",
      payload: {
        time: "2025-01-01T06:00:00.000Z",
        timezone: "America/New_York",
        bmi: 23.9,
      } as unknown,
    };
    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fact-only (no canonical)");
    expect(result.reason).toBe("UNSUPPORTED_KIND");
    expect(result.details).toEqual(
      expect.objectContaining({
        kind: "body_composition",
        factOnly: true,
        rawEventId: "raw_body_comp_1",
      }),
    );
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

  it("treats oura_raw as memory-only (no canonical output)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "oura_session_2025-01-01_0",
      provider: "manual",
      kind: "oura_raw",
      payload: {
        dataset: "session",
        data: { id: "s1" },
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected mapping failure");
    expect(result.reason).toBe("UNSUPPORTED_KIND");
    expect(result.details?.memoryOnly).toBe(true);
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

  it("maps manual nutrition payload to NutritionCanonicalEvent", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "raw_nutrition_1",
      provider: "manual",
      kind: "nutrition",
      payload: {
        start: "2025-01-01T05:00:00.000Z",
        end: "2025-01-01T23:59:59.999Z",
        timezone: "America/New_York",
        day: "2025-01-01",
        totalKcal: 2000,
        proteinG: 120,
        carbsG: 200,
        fatG: 60,
        fiberG: 25,
      } as unknown,
    };

    const result = mapRawEventToCanonical(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected mapping success");

    const canonical = result.canonical;
    expect(canonical.kind).toBe("nutrition");
    if (canonical.kind !== "nutrition") throw new Error("Expected nutrition kind");
    expect(canonical.totalKcal).toBe(2000);
    expect(canonical.proteinG).toBe(120);
    expect(canonical.carbsG).toBe(200);
    expect(canonical.fatG).toBe(60);
    expect(canonical.fiberG).toBe(25);
    expect(canonical.day).toBe(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
        new Date("2025-01-01T05:00:00.000Z"),
      ),
    );
  });
});