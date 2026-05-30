import { describe, it, expect, jest } from "@jest/globals";
import { mergeAppleHealthWorkoutPhysiologyIfNeeded } from "../mergeAppleHealthWorkoutPhysiologyIfNeeded";
import type { IngestRawEventBody } from "../../types/events";

const baseExisting = {
  schemaVersion: 1 as const,
  id: "appleHealth:v2:workout:k",
  userId: "u1",
  sourceId: "healthkit",
  sourceType: "manual",
  provider: "apple_health",
  kind: "workout" as const,
  receivedAt: "2025-01-01T00:00:00.000Z",
  observedAt: "2025-01-01T10:00:00.000Z",
  payload: {
    start: "2025-01-01T10:00:00.000Z",
    end: "2025-01-01T11:00:00.000Z",
    timezone: "UTC",
    sport: "Running",
    durationMinutes: 60,
  },
};

const fullIncomingPhysiology: IngestRawEventBody = {
  provider: "apple_health",
  kind: "workout",
  payload: {
    start: "2025-01-01T10:00:00.000Z",
    end: "2025-01-01T11:00:00.000Z",
    timezone: "UTC",
    sport: "Running",
    durationMinutes: 60,
    averageHeartRateBpm: 140,
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
  },
} as IngestRawEventBody;

describe("mergeAppleHealthWorkoutPhysiologyIfNeeded", () => {
  it("returns false when provider is not apple_health", async () => {
    const u = jest.fn();
    const r = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
      body: { ...fullIncomingPhysiology, provider: "manual" } as IngestRawEventBody,
      existingData: baseExisting,
      update: u,
    });
    expect(r).toBe(false);
    expect(u).not.toHaveBeenCalled();
  });

  it("merges all physiology fields when existing has none; bumps physiologyVersion to 1", async () => {
    const u = jest.fn(() => Promise.resolve());
    const r = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
      body: fullIncomingPhysiology,
      existingData: baseExisting,
      update: u,
    });
    expect(r).toBe(true);
    expect(u).toHaveBeenCalledTimes(1);
    const merged = (u.mock.calls[0]![0]) as Record<string, unknown>;
    expect(merged.averageHeartRateBpm).toBe(140);
    expect(merged.activeEnergyKcal).toBe(380);
    expect(merged.heartRateZoneMinutes).toEqual([2, 5, 18, 4, 1]);
    expect(merged.physiologyVersion).toBe(1);
  });

  it("does NOT overwrite existing physiology fields (additive-only)", async () => {
    const u = jest.fn(() => Promise.resolve());
    const r = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
      body: fullIncomingPhysiology,
      existingData: {
        ...baseExisting,
        payload: {
          ...baseExisting.payload,
          activeEnergyKcal: 999,
          averageHeartRateBpm: 999,
          heartRateZoneMinutes: [99, 99, 99, 99, 99],
          heartRateZoneBasis: {
            modelVersion: "default_thresholds_v1",
            thresholdsBpm: [110, 130, 150, 170],
            userMaxHrBpm: null,
            computedFromSampleCount: 1,
          },
        },
      },
      update: u,
    });
    // Other fields (basalEnergyKcal, totalEnergyKcal, postWorkoutHeartRate) still merge.
    expect(r).toBe(true);
    const merged = (u.mock.calls[0]![0]) as Record<string, unknown>;
    expect(merged.activeEnergyKcal).toBe(999); // preserved
    expect(merged.averageHeartRateBpm).toBe(999); // preserved
    expect(merged.heartRateZoneMinutes).toEqual([99, 99, 99, 99, 99]); // preserved
    expect(merged.basalEnergyKcal).toBe(35); // added
    expect(merged.postWorkoutHeartRate).toBeDefined(); // added
  });

  it("returns false when nothing to merge (existing already has all fields)", async () => {
    const u = jest.fn();
    const fullyEquippedExisting = {
      ...baseExisting,
      payload: {
        ...baseExisting.payload,
        averageHeartRateBpm: 142,
        maxHeartRateBpm: 175,
        activeEnergyKcal: 380,
        basalEnergyKcal: 35,
        totalEnergyKcal: 415,
        heartRateZoneMinutes: [1, 2, 3, 4, 5],
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170],
          userMaxHrBpm: null,
          computedFromSampleCount: 10,
        },
        postWorkoutHeartRate: {
          windowSeconds: 120,
          startBpm: 150,
          endBpm: 110,
          dropBpm: 40,
          sampleCount: 8,
        },
        physiologyVersion: 1,
      },
    };
    const r = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
      body: fullIncomingPhysiology,
      existingData: fullyEquippedExisting,
      update: u,
    });
    expect(r).toBe(false);
    expect(u).not.toHaveBeenCalled();
  });

  it("treats heartRateZoneMinutes + heartRateZoneBasis as a pair (no orphan adds)", async () => {
    const u = jest.fn(() => Promise.resolve());
    // Incoming has only zones, no basis → must NOT merge zones alone.
    const r = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
      body: {
        provider: "apple_health",
        kind: "workout",
        payload: {
          start: baseExisting.payload.start,
          end: baseExisting.payload.end,
          timezone: "UTC",
          sport: "Running",
          durationMinutes: 60,
          heartRateZoneMinutes: [1, 2, 3, 4, 5],
        },
      } as IngestRawEventBody,
      existingData: baseExisting,
      update: u,
    });
    expect(r).toBe(false);
  });

  it("returns false when existing doc fails validation", async () => {
    const u = jest.fn();
    const r = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
      body: fullIncomingPhysiology,
      existingData: { not: "a raw event" },
      update: u,
    });
    expect(r).toBe(false);
  });
});
