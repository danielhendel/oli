import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);
const confidenceSchema = z.record(z.string(), z.number().finite().min(0).max(1)).optional();

export const dailyFactsDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    userId: z.string().min(1),
    date: dayKeySchema,
    computedAt: isoString,

    sleep: z
      .object({ totalMinutes: z.number().finite().optional() })
      .strip()
      .optional(),

    activity: z
      .object({
        steps: z.number().finite().optional(),
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

    confidence: confidenceSchema,
  })
  .strip();

export type DailyFactsDto = z.infer<typeof dailyFactsDtoSchema>;
