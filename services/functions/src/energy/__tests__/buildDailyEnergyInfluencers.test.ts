import { buildDailyEnergyInfluencersFromFacts } from "../buildDailyEnergyInfluencers";
import type { DailyFacts } from "../../types/health";

/**
 * Workout Physiology v1 — visibility fix.
 *
 * Asserts that `buildDailyEnergyInfluencersFromFacts` preserves every Phase B
 * cardio + strength physiology field on the way from `DailyFacts.{cardio,strength}`
 * onto `DailyEnergyInfluencers.{cardio,strength}`. The bug fixed here was that
 * the cardio block dropped `averageHeartRateBpm`, `maxHeartRateBpm`,
 * `paceMinPerKm`, `speedMetersPerSecond`, `activeEnergyKcal`, `totalEnergyKcal`,
 * `heartRateZoneMinutes`, `heartRateZoneBasis` even though the aggregator
 * populated them — so Cardio Today's "Avg Heart Rate" / "Avg Pace" rendered "—".
 *
 * Strict missing-data semantics: any field absent on the source must remain
 * absent on the output (no nulls, no zeros, no defaults).
 */

const BASE: DailyFacts = {
  userId: "u",
  date: "2026-05-31" as DailyFacts["date"],
  schemaVersion: 1,
  computedAt: "2026-05-31T12:00:00.000Z" as DailyFacts["computedAt"],
};

describe("buildDailyEnergyInfluencersFromFacts — cardio physiology preservation", () => {
  it("forwards every Phase B cardio field when present on DailyCardioFacts", () => {
    const input: DailyFacts = {
      ...BASE,
      cardio: {
        durationMinutes: 34,
        distanceMeters: 3895.1,
        sessions: 2,
        primarySport: "Running",
        averageHeartRateBpm: 142,
        maxHeartRateBpm: 178,
        paceMinPerKm: 5.5,
        speedMetersPerSecond: 3.03,
        activeEnergyKcal: 230,
        totalEnergyKcal: 281,
        heartRateZoneMinutes: [4, 10, 12, 6, 2] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      },
    };

    const out = buildDailyEnergyInfluencersFromFacts(input);

    expect(out?.cardio).toEqual({
      durationMinutes: 34,
      distanceMeters: 3895.1,
      sport: "Running",
      averageHeartRateBpm: 142,
      maxHeartRateBpm: 178,
      paceMinPerKm: 5.5,
      speedMetersPerSecond: 3.03,
      activeEnergyKcal: 230,
      totalEnergyKcal: 281,
      heartRateZoneMinutes: [4, 10, 12, 6, 2],
      heartRateZoneBasis: {
        modelVersion: "default_thresholds_v1",
        thresholdsBpm: [110, 130, 150, 170],
      },
    });
  });

  it("omits each cardio field when the source field is missing (no nulls / zeros / defaults)", () => {
    const input: DailyFacts = {
      ...BASE,
      cardio: {
        durationMinutes: 34,
        sessions: 1,
        primarySport: "Walking",
      },
    };

    const out = buildDailyEnergyInfluencersFromFacts(input);

    expect(out?.cardio).toEqual({
      durationMinutes: 34,
      sport: "Walking",
    });
    expect(out?.cardio).not.toHaveProperty("averageHeartRateBpm");
    expect(out?.cardio).not.toHaveProperty("maxHeartRateBpm");
    expect(out?.cardio).not.toHaveProperty("paceMinPerKm");
    expect(out?.cardio).not.toHaveProperty("speedMetersPerSecond");
    expect(out?.cardio).not.toHaveProperty("activeEnergyKcal");
    expect(out?.cardio).not.toHaveProperty("totalEnergyKcal");
    expect(out?.cardio).not.toHaveProperty("heartRateZoneMinutes");
    expect(out?.cardio).not.toHaveProperty("heartRateZoneBasis");
  });

  it("preserves cardio averageHeartRateBpm in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: { durationMinutes: 30, sessions: 1, averageHeartRateBpm: 138 },
    });
    expect(out?.cardio?.averageHeartRateBpm).toBe(138);
  });

  it("preserves cardio maxHeartRateBpm in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: { durationMinutes: 30, sessions: 1, maxHeartRateBpm: 181 },
    });
    expect(out?.cardio?.maxHeartRateBpm).toBe(181);
  });

  it("preserves cardio paceMinPerKm in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: { durationMinutes: 30, sessions: 1, paceMinPerKm: 6 },
    });
    expect(out?.cardio?.paceMinPerKm).toBe(6);
  });

  it("preserves cardio speedMetersPerSecond in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: { durationMinutes: 30, sessions: 1, speedMetersPerSecond: 2.78 },
    });
    expect(out?.cardio?.speedMetersPerSecond).toBe(2.78);
  });

  it("preserves cardio activeEnergyKcal in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: { durationMinutes: 30, sessions: 1, activeEnergyKcal: 218 },
    });
    expect(out?.cardio?.activeEnergyKcal).toBe(218);
  });

  it("preserves cardio totalEnergyKcal in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: { durationMinutes: 30, sessions: 1, totalEnergyKcal: 281 },
    });
    expect(out?.cardio?.totalEnergyKcal).toBe(281);
  });

  it("preserves cardio heartRateZoneMinutes tuple in isolation", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: {
        durationMinutes: 30,
        sessions: 1,
        heartRateZoneMinutes: [1, 2, 3, 4, 5] as const,
      },
    });
    expect(out?.cardio?.heartRateZoneMinutes).toEqual([1, 2, 3, 4, 5]);
  });

  it("preserves cardio heartRateZoneBasis in isolation", () => {
    const basis = {
      modelVersion: "default_thresholds_v1" as const,
      thresholdsBpm: [110, 130, 150, 170] as const,
    };
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: {
        durationMinutes: 30,
        sessions: 1,
        heartRateZoneBasis: basis,
      },
    });
    expect(out?.cardio?.heartRateZoneBasis).toEqual(basis);
  });

  it("ignores a malformed heartRateZoneMinutes tuple (wrong length)", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      cardio: {
        durationMinutes: 30,
        sessions: 1,
        // intentionally invalid — fail-closed: drop, do not emit
        heartRateZoneMinutes: [1, 2, 3] as unknown as readonly [
          number,
          number,
          number,
          number,
          number,
        ],
      },
    });
    expect(out?.cardio).not.toHaveProperty("heartRateZoneMinutes");
  });
});

describe("buildDailyEnergyInfluencersFromFacts — strength physiology preservation", () => {
  it("forwards Phase B strength activeEnergyKcal + totalEnergyKcal when present", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      strength: {
        workoutsCount: 1,
        totalSets: 14,
        totalReps: 142,
        totalVolumeByUnit: { kg: 4200 },
        volumeKg: 4200,
        durationMinutes: 34,
        primarySport: "TraditionalStrengthTraining",
        averageHeartRateBpm: 124,
        maxHeartRateBpm: 162,
        activeEnergyKcal: 184,
        totalEnergyKcal: 226,
      },
    });

    expect(out?.strength).toEqual(
      expect.objectContaining({
        durationMinutes: 34,
        volumeKg: 4200,
        sets: 14,
        reps: 142,
        sport: "TraditionalStrengthTraining",
        averageHeartRateBpm: 124,
        maxHeartRateBpm: 162,
        activeEnergyKcal: 184,
        totalEnergyKcal: 226,
      }),
    );
    // densityKgPerMinute is derived from volumeKg/durationMinutes — sanity check
    // it's still computed when both inputs are present.
    expect(typeof out?.strength?.densityKgPerMinute).toBe("number");
  });

  it("omits strength activeEnergyKcal/totalEnergyKcal when absent", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      strength: {
        workoutsCount: 1,
        totalSets: 14,
        totalReps: 142,
        totalVolumeByUnit: { kg: 4200 },
        durationMinutes: 34,
      },
    });

    expect(out?.strength).not.toHaveProperty("activeEnergyKcal");
    expect(out?.strength).not.toHaveProperty("totalEnergyKcal");
  });

  // Workout Physiology v1 — Phase C: strength zones forwarded into influencers.
  it("forwards Phase C strength heartRateZoneMinutes when present", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      strength: {
        workoutsCount: 1,
        totalSets: 14,
        totalReps: 142,
        totalVolumeByUnit: { kg: 4200 },
        durationMinutes: 34,
        heartRateZoneMinutes: [3, 7, 9, 4, 1] as const,
      },
    });
    expect(out?.strength?.heartRateZoneMinutes).toEqual([3, 7, 9, 4, 1]);
  });

  it("forwards Phase C strength heartRateZoneBasis when present", () => {
    const basis = {
      modelVersion: "default_thresholds_v1" as const,
      thresholdsBpm: [110, 130, 150, 170] as const,
    };
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      strength: {
        workoutsCount: 1,
        totalSets: 14,
        totalReps: 142,
        totalVolumeByUnit: { kg: 4200 },
        durationMinutes: 34,
        heartRateZoneBasis: basis,
      },
    });
    expect(out?.strength?.heartRateZoneBasis).toEqual(basis);
  });

  it("omits strength heartRateZoneMinutes/Basis when absent", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      strength: {
        workoutsCount: 1,
        totalSets: 14,
        totalReps: 142,
        totalVolumeByUnit: { kg: 4200 },
        durationMinutes: 34,
        averageHeartRateBpm: 124,
      },
    });
    expect(out?.strength).not.toHaveProperty("heartRateZoneMinutes");
    expect(out?.strength).not.toHaveProperty("heartRateZoneBasis");
  });

  it("ignores a malformed strength heartRateZoneMinutes tuple (wrong length)", () => {
    const out = buildDailyEnergyInfluencersFromFacts({
      ...BASE,
      strength: {
        workoutsCount: 1,
        totalSets: 14,
        totalReps: 142,
        totalVolumeByUnit: { kg: 4200 },
        durationMinutes: 34,
        heartRateZoneMinutes: [1, 2, 3] as unknown as readonly [
          number,
          number,
          number,
          number,
          number,
        ],
      },
    });
    expect(out?.strength).not.toHaveProperty("heartRateZoneMinutes");
  });
});

describe("buildDailyEnergyInfluencersFromFacts — overall shape", () => {
  it("returns undefined when no domain has any data", () => {
    expect(buildDailyEnergyInfluencersFromFacts(BASE)).toBeUndefined();
  });

  it("does not mutate the input DailyFacts", () => {
    const input: DailyFacts = {
      ...BASE,
      cardio: {
        durationMinutes: 34,
        sessions: 1,
        averageHeartRateBpm: 142,
      },
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    buildDailyEnergyInfluencersFromFacts(input);
    expect(input).toEqual(snapshot);
  });
});
