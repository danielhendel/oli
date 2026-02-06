// lib/contracts/dailyFacts.ts
import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);
const confidenceSchema = z.record(z.string(), z.number().finite().min(0).max(1)).optional();

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

    sleep: z.object({ totalMinutes: z.number().finite().optional() }).strip().optional(),
    activity: z
      .object({
        steps: z.number().finite().optional(),
        distanceKm: z.number().finite().optional(),
        moveMinutes: z.number().finite().optional(),
        trainingLoad: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    recovery: z
      .object({
        hrvRmssd: z.number().finite().optional(),
        hrvRmssdBaseline: z.number().finite().optional(),
        hrvRmssdDeviation: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    body: z
      .object({
        weightKg: z.number().finite().optional(),
        bodyFatPercent: z.number().finite().optional(),
      })
      .strip()
      .optional(),
    nutrition: z
      .object({
        totalKcal: z.number().finite().optional(),
        proteinG: z.number().finite().optional(),
        carbsG: z.number().finite().optional(),
        fatG: z.number().finite().optional(),
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
      })
      .strip()
      .optional(),

    confidence: confidenceSchema,
  })
  .strip();

export type DailyFactsDto = z.infer<typeof dailyFactsDtoSchema>;
