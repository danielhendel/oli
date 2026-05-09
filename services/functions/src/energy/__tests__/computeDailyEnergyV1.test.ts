import { describe, expect, it } from "@jest/globals";
import type { DailyFacts } from "../../types/health";
import { computeDailyEnergyV1 } from "../computeDailyEnergyV1";

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

const baseFacts: DailyFacts = {
  schemaVersion: 1,
  userId: "u1",
  date: "2026-05-05",
  computedAt: "2026-05-05T12:00:00.000Z",
};

describe("computeDailyEnergyV1", () => {
  it("returns energy for full input data", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        activity: { steps: 10000, trainingLoad: 30 },
        strength: {
          workoutsCount: 1,
          totalSets: 5,
          totalReps: 40,
          totalVolumeByUnit: { kg: 3000 },
          volumeKg: 3000,
        },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });

    expect(result).toBeDefined();
    expect(result?.estimatedKcal.low).toBeGreaterThan(0);
    expect(result?.modelVersion).toBe("daily_energy_v3");
    expect(result?.factors.baseline).toBeDefined();
    expect(result?.factors.steps).toBeDefined();
    expect(result?.factors.strength?.inputsUsed).toContain("strength.volumeKg");
    expect(result?.factors.baseline?.kcalLow).toBeDefined();
    expect(result?.factors.baseline?.kcalHigh).toBeGreaterThanOrEqual(
      result?.factors.baseline?.kcalLow ?? 0,
    );
  });

  it("returns low confidence when weight is missing", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: { ...baseFacts, activity: { steps: 8000 } },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    expect(result?.confidence).toBe("low");
  });

  it("uses last-known weight for baseline when current-day weight is missing", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: { ...baseFacts, activity: { steps: 7000 } },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      latestBodyFacts: { weightKg: 79, sourceDay: "2026-05-01", isCarriedForward: true },
    });
    expect(result).toBeDefined();
    expect(result?.factors.baseline?.kcalLow).toBeGreaterThan(0);
    expect(result?.factors.baseline?.inputsUsed).toContain("body.weightKg:lastKnown");
    expect(result?.factors.baseline?.confidence).toBe("moderate");
  });

  it("prefers lean-mass-aware baseline path when lean metrics exist", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 82, bodyFatPercent: 20 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    expect(result?.factors.baseline?.kcalLow).toBeGreaterThan(1400);
    expect(result?.factors.baseline?.inputsUsed.join(",")).toContain("body.bodyFatPercent");
  });

  it("computes NEAT with carried-forward weight when steps exist", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: { ...baseFacts, activity: { steps: 9000 } },
      latestBodyFacts: { weightKg: 76, sourceDay: "2026-04-30", isCarriedForward: true },
    });
    expect(result).toBeDefined();
    expect(result?.factors.steps?.kcalLow).toBeGreaterThan(0);
    expect(result?.factors.steps?.inputsUsed).toContain("body.weightKg:lastKnown");
    expect(result?.factors.steps?.confidence).toBe("moderate");
  });

  it("does not require cardio/strength when baseline + steps are available", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: { ...baseFacts, body: { weightKg: 78 }, activity: { steps: 8000 } },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "female", heightCm: 168 },
    });
    expect(result).toBeDefined();
    expect(result?.factors.baseline).toBeDefined();
    expect(result?.factors.steps).toBeDefined();
    expect(result?.factors.cardio).toBeUndefined();
    expect(result?.factors.strength).toBeUndefined();
  });

  it("returns partial result with only steps", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: { ...baseFacts, activity: { steps: 5000 } },
    });
    expect(result).toBeDefined();
    expect(result?.factors.steps).toBeDefined();
    expect(result?.factors.baseline).toBeUndefined();
  });

  it("returns undefined when no usable inputs exist", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: baseFacts,
    });
    expect(result).toBeUndefined();
  });

  it("does not add cardio factor for strength-only dailyFacts (cardio rollup empty)", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        strength: {
          workoutsCount: 1,
          totalSets: 0,
          totalReps: 0,
          totalVolumeByUnit: {},
          durationMinutes: 50,
          primarySport: "TraditionalStrengthTraining",
        },
        activity: { steps: 6000 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    expect(result?.factors.cardio).toBeUndefined();
    expect(result?.factors.strength?.inputsUsed).toContain("strength.durationMinutes");
  });

  it("includes cardio factor from aggregated cardio duration and body weight", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 75 },
        cardio: { durationMinutes: 40, sessions: 1 },
        activity: { steps: 5000 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    expect(result?.factors.cardio).toBeDefined();
    expect(result?.factors.cardio?.kcalLow).toBeGreaterThan(0);
    expect(result?.factors.cardio?.kcalHigh).toBeGreaterThanOrEqual(result?.factors.cardio?.kcalLow ?? 0);
    expect(result?.factors.cardio?.inputsUsed).toContain("cardio.durationMinutes");
  });

  it("omits duration-based cardio when body weight is missing", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        cardio: { durationMinutes: 40, sessions: 1 },
        activity: { steps: 8000 },
      },
    });
    expect(result).toBeDefined();
    expect(result?.factors.cardio).toBeUndefined();
  });

  it("merges duration-based cardio with trainingLoad cardio when both exist", () => {
    const durationOnly = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 75 },
        cardio: { durationMinutes: 30, sessions: 1 },
        activity: { trainingLoad: 20 },
      },
    });
    const loadOnly = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 75 },
        activity: { trainingLoad: 20 },
      },
    });
    expect(durationOnly?.factors.cardio?.kcalLow).toBeGreaterThan(loadOnly?.factors.cardio?.kcalLow ?? 0);
    expect(durationOnly?.factors.cardio?.inputsUsed.join(",")).toContain("trainingLoad");
    expect(durationOnly?.factors.cardio?.inputsUsed.join(",")).toContain("cardio.durationMinutes");
  });

  it("applies ±6% variance on BMR when lean mass path is used", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 100, leanBodyMassKg: 70 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    const mid = 370 + 21.6 * 70;
    expect(result?.factors.baseline?.kcalLow).toBe(round1(mid * 0.94));
    expect(result?.factors.baseline?.kcalHigh).toBe(round1(mid * 1.06));
  });

  it("applies asymmetric 8–10% variance on BMR for Mifflin–St Jeor when lean mass is absent", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    const ageYears = 36;
    const mid = round1(10 * 80 + 6.25 * 180 - 5 * ageYears + 5);
    expect(result?.factors.baseline?.kcalLow).toBe(round1(mid * 0.92));
    expect(result?.factors.baseline?.kcalHigh).toBe(round1(mid * 1.1));
  });

  it("uses ±15% NEAT band when walking distance is absent", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        activity: { steps: 10000 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    const kcalPerStep = 0.0005 * 80 + 0.01;
    const mid = round1(10000 * kcalPerStep);
    expect(result?.factors.steps?.kcalLow).toBe(round1(mid * 0.85));
    expect(result?.factors.steps?.kcalHigh).toBe(round1(mid * 1.15));
    expect(result?.factors.steps?.inputsUsed.join(",")).not.toContain("activity.distanceKm");
  });

  it("uses ±10% NEAT band when activity.distanceKm is present", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        activity: { steps: 10000, distanceKm: 8 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    const kcalPerStep = 0.0005 * 80 + 0.01;
    const mid = round1(10000 * kcalPerStep);
    expect(result?.factors.steps?.kcalLow).toBe(round1(mid * 0.9));
    expect(result?.factors.steps?.kcalHigh).toBe(round1(mid * 1.1));
    expect(result?.factors.steps?.inputsUsed).toContain("activity.distanceKm");
  });

  it("estimatedKcal low/high equals sum of factor lows/highs", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 78 },
        activity: { steps: 8000 },
      },
      profile: { dateOfBirth: "1992-05-10", sexAtBirth: "female", heightCm: 168 },
    });
    expect(result).toBeDefined();
    const lowSum =
      (result?.factors.baseline?.kcalLow ?? 0) +
      (result?.factors.steps?.kcalLow ?? 0) +
      (result?.factors.cardio?.kcalLow ?? 0) +
      (result?.factors.strength?.kcalLow ?? 0);
    const highSum =
      (result?.factors.baseline?.kcalHigh ?? 0) +
      (result?.factors.steps?.kcalHigh ?? 0) +
      (result?.factors.cardio?.kcalHigh ?? 0) +
      (result?.factors.strength?.kcalHigh ?? 0);
    expect(result?.estimatedKcal.low).toBe(round1(lowSum));
    expect(result?.estimatedKcal.high).toBe(round1(highSum));
  });

  it("uses MET range for strength when durationMinutes and body weight exist", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        activity: { steps: 5000 },
        strength: {
          workoutsCount: 1,
          totalSets: 10,
          totalReps: 50,
          totalVolumeByUnit: { kg: 2000 },
          volumeKg: 2000,
          durationMinutes: 45,
        },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    expect(result?.factors.strength?.inputsUsed).toContain("strength.durationMinutes");
    expect(result?.factors.strength?.inputsUsed).not.toContain("strength.volumeKg");
    const low = ((3.5 * 3.5 * 80) / 200) * 45;
    const high = ((6 * 3.5 * 80) / 200) * 45;
    expect(result?.factors.strength?.kcalLow).toBe(round1(low));
    expect(result?.factors.strength?.kcalHigh).toBe(round1(high));
  });

  it("derives strength volume from totalVolumeByUnit when volumeKg rollup is absent", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        activity: { steps: 4000 },
        strength: {
          workoutsCount: 1,
          totalSets: 2,
          totalReps: 18,
          totalVolumeByUnit: { kg: 500 },
        },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result?.factors.strength?.kcalLow).toBe(round1(500 * 0.03));
    expect(result?.factors.strength?.kcalHigh).toBe(round1(500 * 0.06));
  });

  it("uses session-count fallback for strength when volume and duration are absent", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80 },
        activity: { steps: 4000 },
        strength: {
          workoutsCount: 2,
          totalSets: 0,
          totalReps: 0,
          totalVolumeByUnit: {},
        },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result?.factors.strength?.confidence).toBe("low");
    expect(result?.factors.strength?.kcalLow).toBe(round1(240));
    expect(result?.factors.strength?.kcalHigh).toBe(round1(440));
  });

  it("is deterministic for identical input", () => {
    const input = {
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 77 },
        activity: { steps: 9000, trainingLoad: 20 },
      },
      profile: { dateOfBirth: "1992-05-10", sexAtBirth: "female", heightCm: 168 },
    } as const;
    const a = computeDailyEnergyV1(input);
    const b = computeDailyEnergyV1(input);
    expect(a).toEqual(b);
  });

  it("ignores implausibly tiny imported RMR and falls back to conservative weight-based baseline", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 70, restingMetabolicRateKcal: 60 },
      },
    });
    expect(result).toBeDefined();
    const mid = round1(22 * 70);
    expect(result?.factors.baseline?.kcalLow).toBe(round1(mid * 0.92));
    expect(result?.factors.baseline?.kcalHigh).toBe(round1(mid * 1.1));
    expect(result?.factors.baseline?.inputsUsed).not.toContain("body.restingMetabolicRateKcal");
  });

  it("prefers Mifflin baseline over imported RMR when profile inputs are present", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80, restingMetabolicRateKcal: 1400 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    const ageYears = 36;
    const mid = round1(10 * 80 + 6.25 * 180 - 5 * ageYears + 5);
    expect(result?.factors.baseline?.kcalLow).toBe(round1(mid * 0.92));
    expect(result?.factors.baseline?.kcalHigh).toBe(round1(mid * 1.1));
    expect(result?.factors.baseline?.inputsUsed).toContain("profile.heightCm");
    expect(result?.factors.baseline?.inputsUsed).not.toContain("body.restingMetabolicRateKcal");
  });

  it("prefers Katch-McArdle baseline over imported RMR when lean mass is available", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { weightKg: 80, leanBodyMassKg: 62, restingMetabolicRateKcal: 1500 },
      },
      profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
    });
    expect(result).toBeDefined();
    const mid = round1(370 + 21.6 * 62);
    expect(result?.factors.baseline?.kcalLow).toBe(round1(mid * 0.94));
    expect(result?.factors.baseline?.kcalHigh).toBe(round1(mid * 1.06));
    expect(result?.factors.baseline?.inputsUsed.join(",")).toContain("body.leanBodyMassKg");
    expect(result?.factors.baseline?.inputsUsed).not.toContain("body.restingMetabolicRateKcal");
  });

  it("accepts realistic imported daily RMR when stronger baseline inputs are absent", () => {
    const result = computeDailyEnergyV1({
      dailyFacts: {
        ...baseFacts,
        body: { restingMetabolicRateKcal: 1680 },
      },
    });
    expect(result).toBeDefined();
    expect(result?.factors.baseline?.kcalLow).toBe(round1(1680 * 0.92));
    expect(result?.factors.baseline?.kcalHigh).toBe(round1(1680 * 1.1));
    expect(result?.factors.baseline?.inputsUsed).toContain("body.restingMetabolicRateKcal");
  });
});
