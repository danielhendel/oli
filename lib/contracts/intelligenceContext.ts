// lib/contracts/intelligenceContext.ts
import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);
const confidenceSchema = z.record(z.string(), z.number().finite().min(0).max(1)).optional();

const computeMetaSchema = z
  .object({
    computedAt: isoString,
    pipelineVersion: z.number().int().positive(),
    source: z.record(z.string(), z.unknown()).optional(),
  })
  .strip();

export const intelligenceContextDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().min(1),

    id: dayKeySchema,
    userId: z.string().min(1),
    date: dayKeySchema,

    // existing
    computedAt: isoString,

    // new (contract)
    meta: computeMetaSchema.optional(),

    confidence: confidenceSchema,

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

    insights: z
      .object({
        count: z.number().int(),
        severities: z.record(z.string(), z.number().int()).optional(),
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
