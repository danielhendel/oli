// lib/contracts/dailyFacts.ts
import { z } from "zod";
import { dayKeySchema } from "./day";
import { oliSleepScoreV1Schema } from "./oliSleepScore";

const isoString = z.string().min(1);
const confidenceSchema = z.record(z.string(), z.number().finite().min(0).max(1)).optional();
const energyConfidenceSchema = z.enum(["low", "moderate", "high"]);
const energyFactorSchema = z
  .object({
    kcal: z.number().finite().optional(),
    kcalLow: z.number().finite().optional(),
    kcalHigh: z.number().finite().optional(),
    confidence: energyConfidenceSchema,
    inputsUsed: z.array(z.string()),
    inputsMissing: z.array(z.string()),
  })
  .strip();
const dailyEnergySchema = z
  .object({
    modelVersion: z.string(),
    computedAt: z.string(),
    day: z.string(),
    estimatedKcal: z.object({
      low: z.number(),
      high: z.number(),
      midpoint: z.number(),
    }),
    variancePct: z.number(),
    confidence: energyConfidenceSchema,
    factors: z
      .object({
        baseline: energyFactorSchema.optional(),
        steps: energyFactorSchema.optional(),
        cardio: energyFactorSchema.optional(),
        strength: energyFactorSchema.optional(),
      })
      .strip(),
    missingRequiredInputs: z.array(z.string()),
    largestDriver: z.enum(["baseline", "steps", "cardio", "strength"]).optional(),
  })
  .strip();
const energyInfluencersSchema = z
  .object({
    movement: z
      .object({
        steps: z.number().finite().optional(),
        distanceMeters: z.number().finite().optional(),
        activeEnergyKcal: z.number().finite().optional(),
        exerciseMinutes: z.number().finite().optional(),
        standHours: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    cardio: z
      .object({
        durationMinutes: z.number().finite().optional(),
        distanceMeters: z.number().finite().optional(),
        sport: z.string().min(1).optional(),
        averageHeartRateBpm: z.number().finite().optional(),
        maxHeartRateBpm: z.number().finite().optional(),
        paceMinPerKm: z.number().finite().optional(),
        speedMetersPerSecond: z.number().finite().optional(),
        activeEnergyKcal: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    strength: z
      .object({
        durationMinutes: z.number().finite().optional(),
        volumeKg: z.number().finite().optional(),
        sets: z.number().finite().optional(),
        reps: z.number().finite().optional(),
        densityKgPerMinute: z.number().finite().optional(),
        activeEnergyKcal: z.number().finite().optional(),
        averageHeartRateBpm: z.number().finite().optional(),
        maxHeartRateBpm: z.number().finite().optional(),
        sport: z.string().min(1).optional(),
      })
      .strip()
      .optional(),
    physiology: z
      .object({
        restingHeartRateBpm: z.number().finite().optional(),
        hrvRmssdMs: z.number().finite().optional(),
      })
      .strip()
      .optional(),
  })
  .strip();

// NOTE: meta.* is the readiness contract surface.
// We keep top-level computedAt for backwards compatibility.
const computeMetaSchema = z
  .object({
    computedAt: isoString,
    pipelineVersion: z.number().int().positive(),
    source: z.record(z.string(), z.unknown()).optional(),
  })
  .strip();

export const dailyFactsDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    userId: z.string().min(1),
    date: dayKeySchema,

    // existing
    computedAt: isoString,

    // new (contract)
    meta: computeMetaSchema.optional(),

    sleep: z
      .object({
        totalMinutes: z.number().finite().optional(),
        mainSleepMinutes: z.number().finite().optional(),
        /** Aggregate mean of episode efficiencies (0–1), matches canonical sleep */
        efficiency: z.number().finite().optional(),
        latencyMinutes: z.number().finite().optional(),
        awakenings: z.number().finite().optional(),
        remSleepMinutes: z.number().finite().optional(),
        deepSleepMinutes: z.number().finite().optional(),
        primarySourceId: z.string().min(1).optional(),
        oliSleepScore: oliSleepScoreV1Schema.optional(),
      })
      .strip()
      .optional(),
    activity: z
      .object({
        steps: z.number().finite().optional(),
        distanceKm: z.number().finite().optional(),
        moveMinutes: z.number().finite().optional(),
        trainingLoad: z.number().finite().optional(),
        /**
         * Phase 2A — Deterministic partition of `activity.steps` into NEAT vs workout buckets.
         * Invariant: `neatSteps + strengthSteps + cardioSteps === activity.steps`.
         * Omitted entirely (fail-closed) when the partition cannot be computed from real data.
         */
        stepsAllocation: z
          .object({
            modelVersion: z.literal("activity_steps_allocation_v1"),
            neatSteps: z.number().int().nonnegative(),
            strengthSteps: z.number().int().nonnegative(),
            cardioSteps: z.number().int().nonnegative(),
            inputsUsed: z.array(z.string()),
            inputsMissing: z.array(z.string()),
          })
          .strip()
          .optional(),
      })
      .strip()
      .optional(),
    recovery: z
      .object({
        hrvRmssd: z.number().finite().optional(),
        hrvRmssdBaseline: z.number().finite().optional(),
        hrvRmssdDeviation: z.number().finite().optional(),
        restingHeartRate: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    body: z
      .object({
        weightKg: z.number().finite().optional(),
        bodyFatPercent: z.number().finite().optional(),
        bmi: z.number().finite().optional(),
        leanBodyMassKg: z.number().finite().optional(),
        restingMetabolicRateKcal: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    nutrition: z
      .object({
        totalKcal: z.number().finite().optional(),
        proteinG: z.number().finite().optional(),
        carbsG: z.number().finite().optional(),
        fatG: z.number().finite().optional(),
        fiberG: z.number().finite().optional(),
        sugarG: z.number().finite().optional(),
        sodiumMg: z.number().finite().optional(),
        potassiumMg: z.number().finite().optional(),
        mealCount: z.number().int().nonnegative().optional(),
        loggedMealCount: z.number().int().nonnegative().optional(),
        firstMealAt: isoString.optional(),
        lastMealAt: isoString.optional(),
        proteinRatio: z.number().finite().min(0).max(1).optional(),
        carbRatio: z.number().finite().min(0).max(1).optional(),
        fatRatio: z.number().finite().min(0).max(1).optional(),
        mealTimingSpread: z.number().finite().nonnegative().optional(),
        calorieDistributionScore: z.number().int().min(0).max(100).optional(),
        macroBalanceScore: z.number().int().min(0).max(100).optional(),
      })
      .strip()
      .optional(),
    strength: z
      .object({
        workoutsCount: z.number().int().nonnegative(),
        totalSets: z.number().int().nonnegative(),
        totalReps: z.number().int().nonnegative(),
        totalVolumeByUnit: z.object({
          lb: z.number().finite().nonnegative().optional(),
          kg: z.number().finite().nonnegative().optional(),
        }),
        volumeKg: z.number().finite().nonnegative().optional(),
        durationMinutes: z.number().finite().nonnegative().optional(),
        primarySport: z.string().min(1).optional(),
        averageHeartRateBpm: z.number().finite().optional(),
        maxHeartRateBpm: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    cardio: z
      .object({
        durationMinutes: z.number().finite().nonnegative(),
        distanceMeters: z.number().finite().nonnegative().optional(),
        sessions: z.number().int().nonnegative(),
        primarySport: z.string().min(1).optional(),
        averageHeartRateBpm: z.number().finite().optional(),
        maxHeartRateBpm: z.number().finite().optional(),
        paceMinPerKm: z.number().finite().optional(),
        speedMetersPerSecond: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    energy: dailyEnergySchema.optional(),
    energyInfluencers: energyInfluencersSchema.optional(),

    confidence: confidenceSchema,
  })
  .strip();

export type DailyFactsDto = z.infer<typeof dailyFactsDtoSchema>;
