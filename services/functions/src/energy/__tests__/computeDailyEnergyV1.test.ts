import { describe, expect, it } from "@jest/globals";
import type { ActivityStepsAllocationV1, DailyFacts } from "../../types/health";
import { computeDailyEnergyV1, resolveNeatStepsForEnergy } from "../computeDailyEnergyV1";

const allocation = (
  partial: Partial<ActivityStepsAllocationV1> & {
    neatSteps: number;
    strengthSteps: number;
    cardioSteps: number;
  },
): ActivityStepsAllocationV1 => ({
  modelVersion: "activity_steps_allocation_v1",
  inputsUsed: ["activity.steps", "workout.steps"],
  inputsMissing: [],
  ...partial,
});

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

  describe("NEAT source selection (stepsAllocation)", () => {
    it("uses stepsAllocation.neatSteps when the partition is valid", () => {
      const weightKg = 80;
      const result = computeDailyEnergyV1({
        dailyFacts: {
          ...baseFacts,
          body: { weightKg },
          activity: {
            steps: 10000,
            stepsAllocation: allocation({
              neatSteps: 3000,
              strengthSteps: 1000,
              cardioSteps: 6000,
            }),
          },
        },
        profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      });
      expect(result).toBeDefined();
      const kcalPerStep = 0.0005 * weightKg + 0.01;
      const mid = round1(3000 * kcalPerStep);
      expect(result?.factors.steps?.kcalLow).toBe(round1(mid * 0.85));
      expect(result?.factors.steps?.kcalHigh).toBe(round1(mid * 1.15));
      expect(result?.factors.steps?.inputsUsed).toContain("activity.stepsAllocation.neatSteps");
      expect(result?.factors.steps?.inputsUsed).not.toContain("steps");
    });

    it("falls back to activity.steps when allocation is missing", () => {
      const weightKg = 80;
      const totalSteps = 10000;
      const result = computeDailyEnergyV1({
        dailyFacts: {
          ...baseFacts,
          body: { weightKg },
          activity: { steps: totalSteps },
        },
        profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      });
      expect(result).toBeDefined();
      const kcalPerStep = 0.0005 * weightKg + 0.01;
      const mid = round1(totalSteps * kcalPerStep);
      expect(result?.factors.steps?.kcalLow).toBe(round1(mid * 0.85));
      expect(result?.factors.steps?.kcalHigh).toBe(round1(mid * 1.15));
      expect(result?.factors.steps?.inputsUsed).toContain("steps");
      expect(result?.factors.steps?.inputsUsed).not.toContain(
        "activity.stepsAllocation.neatSteps",
      );
    });

    it("falls back to activity.steps when the allocation partition is invalid (sum mismatch)", () => {
      const weightKg = 80;
      const totalSteps = 10000;
      const result = computeDailyEnergyV1({
        dailyFacts: {
          ...baseFacts,
          body: { weightKg },
          activity: {
            steps: totalSteps,
            // Sum (2500 + 1000 + 6000 = 9500) != 10000 → invalid partition.
            stepsAllocation: allocation({
              neatSteps: 2500,
              strengthSteps: 1000,
              cardioSteps: 6000,
            }),
          },
        },
        profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      });
      expect(result).toBeDefined();
      const kcalPerStep = 0.0005 * weightKg + 0.01;
      const mid = round1(totalSteps * kcalPerStep);
      expect(result?.factors.steps?.kcalLow).toBe(round1(mid * 0.85));
      expect(result?.factors.steps?.kcalHigh).toBe(round1(mid * 1.15));
      expect(result?.factors.steps?.inputsUsed).toContain("steps");
      expect(result?.factors.steps?.inputsUsed).not.toContain(
        "activity.stepsAllocation.neatSteps",
      );
    });

    it("falls back to activity.steps when allocation contains negative or non-finite parts", () => {
      const weightKg = 80;
      const totalSteps = 9000;
      const result = computeDailyEnergyV1({
        dailyFacts: {
          ...baseFacts,
          body: { weightKg },
          activity: {
            steps: totalSteps,
            stepsAllocation: allocation({
              neatSteps: -100,
              strengthSteps: 100,
              cardioSteps: 9000,
            }),
          },
        },
        profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      });
      expect(result?.factors.steps?.inputsUsed).toContain("steps");
      expect(result?.factors.steps?.inputsUsed).not.toContain(
        "activity.stepsAllocation.neatSteps",
      );
    });

    it("does not change Cardio, Strength, or BMR outputs when allocation is present", () => {
      const weightKg = 80;
      const sharedDailyFacts: DailyFacts = {
        ...baseFacts,
        body: { weightKg },
        cardio: { durationMinutes: 30, sessions: 1 },
        strength: {
          workoutsCount: 1,
          totalSets: 5,
          totalReps: 40,
          totalVolumeByUnit: { kg: 2000 },
          volumeKg: 2000,
          durationMinutes: 45,
        },
      };
      const profile = { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 };

      const withAllocation = computeDailyEnergyV1({
        dailyFacts: {
          ...sharedDailyFacts,
          activity: {
            steps: 10000,
            stepsAllocation: allocation({
              neatSteps: 3000,
              strengthSteps: 1000,
              cardioSteps: 6000,
            }),
          },
        },
        profile,
      });
      const withoutAllocation = computeDailyEnergyV1({
        dailyFacts: {
          ...sharedDailyFacts,
          activity: { steps: 10000 },
        },
        profile,
      });

      expect(withAllocation?.factors.baseline).toEqual(withoutAllocation?.factors.baseline);
      expect(withAllocation?.factors.cardio).toEqual(withoutAllocation?.factors.cardio);
      expect(withAllocation?.factors.strength).toEqual(withoutAllocation?.factors.strength);
      // NEAT must differ (allocation reduces it).
      expect(withAllocation?.factors.steps?.kcalLow).toBeLessThan(
        withoutAllocation?.factors.steps?.kcalLow ?? 0,
      );
    });

    it("produces no NEAT factor when neither allocation nor total steps are usable", () => {
      const result = computeDailyEnergyV1({
        dailyFacts: {
          ...baseFacts,
          body: { weightKg: 80 },
        },
        profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      });
      expect(result?.factors.steps).toBeUndefined();
    });

    it("emits NEAT factor with 0 kcal when allocation says all steps belong to workouts", () => {
      const result = computeDailyEnergyV1({
        dailyFacts: {
          ...baseFacts,
          body: { weightKg: 80 },
          activity: {
            steps: 5000,
            stepsAllocation: allocation({
              neatSteps: 0,
              strengthSteps: 1500,
              cardioSteps: 3500,
            }),
          },
        },
        profile: { dateOfBirth: "1990-01-01", sexAtBirth: "male", heightCm: 180 },
      });
      expect(result?.factors.steps).toBeDefined();
      expect(result?.factors.steps?.kcalLow).toBe(0);
      expect(result?.factors.steps?.kcalHigh).toBe(0);
      expect(result?.factors.steps?.inputsUsed).toContain("activity.stepsAllocation.neatSteps");
    });
  });

  describe("resolveNeatStepsForEnergy", () => {
    it("returns allocation source when partition is valid", () => {
      expect(
        resolveNeatStepsForEnergy({
          steps: 10000,
          stepsAllocation: allocation({
            neatSteps: 3000,
            strengthSteps: 1000,
            cardioSteps: 6000,
          }),
        }),
      ).toEqual({ value: 3000, source: "allocation" });
    });

    it("returns total source when allocation is missing", () => {
      expect(resolveNeatStepsForEnergy({ steps: 8000 })).toEqual({
        value: 8000,
        source: "total",
      });
    });

    it("returns total source when allocation partition does not equal total steps", () => {
      expect(
        resolveNeatStepsForEnergy({
          steps: 10000,
          stepsAllocation: allocation({
            neatSteps: 1000,
            strengthSteps: 1000,
            cardioSteps: 1000,
          }),
        }),
      ).toEqual({ value: 10000, source: "total" });
    });

    it("returns undefined when both allocation and total steps are unusable", () => {
      expect(resolveNeatStepsForEnergy(undefined)).toBeUndefined();
      expect(resolveNeatStepsForEnergy({})).toBeUndefined();
    });

    it("does not mutate the activity input", () => {
      const activity = {
        steps: 10000,
        stepsAllocation: allocation({
          neatSteps: 3000,
          strengthSteps: 1000,
          cardioSteps: 6000,
        }),
      };
      const snapshot = JSON.parse(JSON.stringify(activity));
      resolveNeatStepsForEnergy(activity);
      expect(activity).toEqual(snapshot);
    });
  });
});
