/**
 * Workout Physiology v1 — DailyFacts aggregation tests.
 *
 * Acceptance:
 * - Cardio: sums activeEnergyKcal + totalEnergyKcal across cardio sessions.
 * - Cardio: tuple-sums heartRateZoneMinutes when every session shares basis.
 * - Cardio: drops zone tuple when bases disagree (fail-closed).
 * - Strength: sums activeEnergyKcal + totalEnergyKcal from strength-tagged workouts.
 * - basalEnergyKcal and postWorkoutHeartRate are NOT rolled up in Phase B.
 */

import { describe, it, expect } from "@jest/globals";
import type { CanonicalEvent, WorkoutCanonicalEvent } from "../../types/health";
import { aggregateDailyFactsForDay } from "../aggregateDailyFacts";

const baseMeta = {
  userId: "user_123",
  sourceId: "healthkit",
  day: "2025-01-01",
  timezone: "America/New_York",
  createdAt: "2025-01-02T03:00:00.000Z",
  updatedAt: "2025-01-02T03:00:00.000Z",
  schemaVersion: 1 as const,
};

const makeCardio = (overrides: Partial<WorkoutCanonicalEvent>): WorkoutCanonicalEvent => ({
  id: "cardio_1",
  kind: "workout",
  start: "2025-01-01T18:00:00.000Z",
  end: "2025-01-01T18:30:00.000Z",
  sport: "Running",
  durationMinutes: 30,
  trainingLoad: null,
  ...baseMeta,
  ...overrides,
});

const makeStrengthTagged = (
  overrides: Partial<WorkoutCanonicalEvent>,
): WorkoutCanonicalEvent => ({
  id: "strength_tag_1",
  kind: "workout",
  start: "2025-01-01T17:00:00.000Z",
  end: "2025-01-01T17:45:00.000Z",
  sport: "TraditionalStrengthTraining",
  durationMinutes: 45,
  trainingLoad: null,
  ...baseMeta,
  ...overrides,
});

describe("aggregateDailyFactsForDay — Workout Physiology v1 cardio", () => {
  it("sums activeEnergyKcal + totalEnergyKcal across cardio sessions", () => {
    const events: CanonicalEvent[] = [
      makeCardio({ id: "c1", activeEnergyKcal: 300, totalEnergyKcal: 330 }),
      makeCardio({ id: "c2", activeEnergyKcal: 250, totalEnergyKcal: 275 }),
    ];
    const r = aggregateDailyFactsForDay({
      userId: "u1",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(r.cardio?.activeEnergyKcal).toBe(550);
    expect(r.cardio?.totalEnergyKcal).toBe(605);
  });

  it("tuple-sums heartRateZoneMinutes when bases agree; stamps basis on day", () => {
    const basis = {
      modelVersion: "default_thresholds_v1" as const,
      thresholdsBpm: [110, 130, 150, 170] as const,
      userMaxHrBpm: null,
      computedFromSampleCount: 30,
    };
    const events: CanonicalEvent[] = [
      makeCardio({
        id: "c1",
        heartRateZoneMinutes: [2, 5, 18, 4, 1] as const,
        heartRateZoneBasis: basis,
      }),
      makeCardio({
        id: "c2",
        heartRateZoneMinutes: [1, 3, 14, 6, 2] as const,
        heartRateZoneBasis: basis,
      }),
    ];
    const r = aggregateDailyFactsForDay({
      userId: "u1",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(r.cardio?.heartRateZoneMinutes).toEqual([3, 8, 32, 10, 3]);
    expect(r.cardio?.heartRateZoneBasis).toEqual({
      modelVersion: "default_thresholds_v1",
      thresholdsBpm: [110, 130, 150, 170],
    });
  });

  it("omits daily zone tuple when bases disagree (fail-closed)", () => {
    const events: CanonicalEvent[] = [
      makeCardio({
        id: "c1",
        heartRateZoneMinutes: [2, 5, 18, 4, 1] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
          userMaxHrBpm: null,
          computedFromSampleCount: 30,
        },
      }),
      makeCardio({
        id: "c2",
        heartRateZoneMinutes: [1, 3, 14, 6, 2] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [115, 135, 155, 175] as const, // different thresholds
          userMaxHrBpm: null,
          computedFromSampleCount: 25,
        },
      }),
    ];
    const r = aggregateDailyFactsForDay({
      userId: "u1",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(r.cardio?.heartRateZoneMinutes).toBeUndefined();
    expect(r.cardio?.heartRateZoneBasis).toBeUndefined();
  });

  it("does NOT roll up basalEnergyKcal or postWorkoutHeartRate in Phase B", () => {
    const events: CanonicalEvent[] = [
      makeCardio({
        id: "c1",
        activeEnergyKcal: 300,
        basalEnergyKcal: 25,
        postWorkoutHeartRate: {
          windowSeconds: 120,
          startBpm: 150,
          endBpm: 110,
          dropBpm: 40,
          sampleCount: 8,
        },
      }),
    ];
    const r = aggregateDailyFactsForDay({
      userId: "u1",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    // basal / recovery NOT in DailyFacts shape
    const cardio = r.cardio as Record<string, unknown> | undefined;
    expect(cardio?.basalEnergyKcal).toBeUndefined();
    expect(cardio?.postWorkoutHeartRateDropBpm).toBeUndefined();
  });
});

describe("aggregateDailyFactsForDay — Workout Physiology v1 strength", () => {
  it("sums activeEnergyKcal + totalEnergyKcal from strength-tagged workouts", () => {
    const events: CanonicalEvent[] = [
      makeStrengthTagged({ id: "s1", activeEnergyKcal: 180, totalEnergyKcal: 200 }),
      makeStrengthTagged({ id: "s2", activeEnergyKcal: 120, totalEnergyKcal: 135 }),
    ];
    const r = aggregateDailyFactsForDay({
      userId: "u1",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(r.strength?.activeEnergyKcal).toBe(300);
    expect(r.strength?.totalEnergyKcal).toBe(335);
  });
});
