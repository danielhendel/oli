/**
 * Workout Physiology v1 — RawEvent → CanonicalEvent physiology mapping tests.
 *
 * Acceptance:
 * - Apple Health workout payload with all physiology fields → canonical 1:1 mapping.
 * - physiologyVersion: 1 stamped when any physiology field present.
 * - Missing fields stay absent (no nulls, no defaults).
 * - Invalid zone shapes (non-tuple, missing basis) drop both fields together.
 * - Mapper is fail-closed: invalid physiology never blocks the workout from mapping.
 */

import { describe, it, expect } from "@jest/globals";
import type { RawEvent } from "../../types/health";
import { mapRawEventToCanonical } from "../mapRawEventToCanonical";

const baseRawEvent = {
  userId: "user_123",
  sourceId: "healthkit",
  sourceType: "manual" as const,
  receivedAt: "2025-01-01T12:00:00.000Z",
  observedAt: "2025-01-01T10:00:00.000Z",
  schemaVersion: 1 as const,
};

const baseWorkoutPayload = {
  start: "2025-01-01T10:00:00.000Z",
  end: "2025-01-01T10:30:00.000Z",
  timezone: "America/New_York",
  sport: "Running",
  durationMinutes: 30,
};

describe("mapRawEventToCanonical — Workout Physiology v1", () => {
  it("maps all physiology fields 1:1 on apple_health workout", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "ah_workout_1",
      provider: "apple_health",
      kind: "workout",
      payload: {
        ...baseWorkoutPayload,
        averageHeartRateBpm: 142,
        maxHeartRateBpm: 172,
        activeEnergyKcal: 380,
        basalEnergyKcal: 35,
        totalEnergyKcal: 415,
        heartRateZoneMinutes: [2, 5, 18, 4, 1],
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170],
          userMaxHrBpm: null,
          computedFromSampleCount: 30,
        },
        postWorkoutHeartRate: {
          windowSeconds: 120,
          startBpm: 150,
          endBpm: 110,
          dropBpm: 40,
          sampleCount: 8,
        },
        physiologyVersion: 1,
      } as unknown,
    };
    const r = mapRawEventToCanonical(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    const c = r.canonical;
    if (c.kind !== "workout") throw new Error("expected workout");
    expect(c.activeEnergyKcal).toBe(380);
    expect(c.basalEnergyKcal).toBe(35);
    expect(c.totalEnergyKcal).toBe(415);
    expect(c.heartRateZoneMinutes).toEqual([2, 5, 18, 4, 1]);
    expect(c.heartRateZoneBasis).toEqual({
      modelVersion: "default_thresholds_v1",
      thresholdsBpm: [110, 130, 150, 170],
      userMaxHrBpm: null,
      computedFromSampleCount: 30,
    });
    expect(c.postWorkoutHeartRate?.dropBpm).toBe(40);
    expect(c.physiologyVersion).toBe(1);
  });

  it("omits physiology fields entirely when absent (no nulls, no defaults)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "ah_workout_2",
      provider: "apple_health",
      kind: "workout",
      payload: baseWorkoutPayload as unknown,
    };
    const r = mapRawEventToCanonical(raw);
    if (!r.ok) throw new Error("expected ok");
    const c = r.canonical;
    if (c.kind !== "workout") throw new Error("expected workout");
    expect(c.activeEnergyKcal).toBeUndefined();
    expect(c.heartRateZoneMinutes).toBeUndefined();
    expect(c.heartRateZoneBasis).toBeUndefined();
    expect(c.postWorkoutHeartRate).toBeUndefined();
    expect(c.physiologyVersion).toBeUndefined();
  });

  it("drops zones when basis is missing (zones + basis travel together)", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "ah_workout_3",
      provider: "apple_health",
      kind: "workout",
      payload: {
        ...baseWorkoutPayload,
        heartRateZoneMinutes: [2, 5, 18, 4, 1],
      } as unknown,
    };
    const r = mapRawEventToCanonical(raw);
    if (!r.ok) throw new Error("expected ok");
    const c = r.canonical;
    if (c.kind !== "workout") throw new Error("expected workout");
    expect(c.heartRateZoneMinutes).toBeUndefined();
    expect(c.heartRateZoneBasis).toBeUndefined();
  });

  it("does not stamp physiologyVersion when no fields are present", () => {
    const raw: RawEvent = {
      ...baseRawEvent,
      id: "ah_workout_4",
      provider: "apple_health",
      kind: "workout",
      payload: {
        ...baseWorkoutPayload,
        averageHeartRateBpm: 130, // not a physiology-only field; legacy summary HR
      } as unknown,
    };
    const r = mapRawEventToCanonical(raw);
    if (!r.ok) throw new Error("expected ok");
    const c = r.canonical;
    if (c.kind !== "workout") throw new Error("expected workout");
    expect(c.averageHeartRateBpm).toBe(130);
    expect(c.physiologyVersion).toBeUndefined();
  });
});
