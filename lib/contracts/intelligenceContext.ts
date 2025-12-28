import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);
const confidenceSchema = z.record(z.string(), z.number().finite().min(0).max(1)).optional();

export const intelligenceContextDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().min(1),

    id: dayKeySchema,
    userId: z.string().min(1),
    date: dayKeySchema,

    computedAt: isoString,

    facts: z
      .object({
        sleepTotalMinutes: z.number().finite().optional(),
        steps: z.number().finite().optional(),
        trainingLoad: z.number().finite().optional(),
        hrvRmssd: z.number().finite().optional(),
        hrvRmssdBaseline: z.number().finite().optional(),
        hrvRmssdDeviation: z.number().finite().optional(),
        weightKg: z.number().finite().optional(),
        bodyFatPercent: z.number().finite().optional(),
      })
      .strip(),

    confidence: confidenceSchema,

    insights: z
      .object({
        count: z.number().int().nonnegative(),
        bySeverity: z
          .object({
            info: z.number().int().nonnegative(),
            warning: z.number().int().nonnegative(),
            critical: z.number().int().nonnegative(),
          })
          .strip(),
        tags: z.array(z.string()),
        kinds: z.array(z.string()),
        ids: z.array(z.string()),
      })
      .strip(),

    readiness: z
      .object({
        hasDailyFacts: z.boolean(),
        hasInsights: z.boolean(),
        domainMeetsConfidence: z.record(z.string(), z.boolean()).optional(),
      })
      .strip(),
  })
  .strip();

export type IntelligenceContextDto = z.infer<typeof intelligenceContextDtoSchema>;
