// services/api/src/types/dtos.ts
import { z } from "zod";
import { dayKeySchema } from "./day";

/**
 * Minimal DTOs for MVP:
 * - Validate + strip unknown keys at the API boundary.
 * - Keep shapes stable and deterministic.
 */

const isoString = z.string().min(1);

// ✅ Zod v4: record(keyType, valueType)
const confidenceSchema = z.record(z.string(), z.number().finite().min(0).max(1)).optional();

const dailySleepFactsSchema = z
  .object({
    totalMinutes: z.number().finite().optional(),
  })
  .strip()
  .optional();

const dailyActivityFactsSchema = z
  .object({
    steps: z.number().finite().optional(),
    trainingLoad: z.number().finite().optional(),
  })
  .strip()
  .optional();

const dailyRecoveryFactsSchema = z
  .object({
    hrvRmssd: z.number().finite().optional(),
    hrvRmssdBaseline: z.number().finite().optional(),
    hrvRmssdDeviation: z.number().finite().optional(),
  })
  .strip()
  .optional();

const dailyBodyFactsSchema = z
  .object({
    weightKg: z.number().finite().optional(),
    bodyFatPercent: z.number().finite().optional(),
  })
  .strip()
  .optional();

const dailyNutritionFactsSchema = z
  .object({
    totalKcal: z.number().finite().optional(),
    proteinG: z.number().finite().optional(),
    carbsG: z.number().finite().optional(),
    fatG: z.number().finite().optional(),
  })
  .strip()
  .optional();

export const dailyFactsDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    userId: z.string().min(1),
    date: dayKeySchema,
    computedAt: isoString,

    sleep: dailySleepFactsSchema,
    activity: dailyActivityFactsSchema,
    recovery: dailyRecoveryFactsSchema,
    body: dailyBodyFactsSchema,
    nutrition: dailyNutritionFactsSchema,

    confidence: confidenceSchema,
  })
  .strip();

export type DailyFactsDto = z.infer<typeof dailyFactsDtoSchema>;

export const insightSeveritySchema = z.enum(["info", "warning", "critical"]);

export const insightEvidencePointDtoSchema = z
  .object({
    factPath: z.string().min(1),
    value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
    threshold: z.number().optional(),
    direction: z.enum(["above", "below", "outside_range"]).optional(),
  })
  .strip();

export const insightDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    userId: z.string().min(1),
    date: dayKeySchema,
    kind: z.string().min(1),
    title: z.string().min(1),
    message: z.string().min(1),
    severity: insightSeveritySchema,
    evidence: z.array(insightEvidencePointDtoSchema),
    tags: z.array(z.string()).optional(),
    createdAt: isoString,
    updatedAt: isoString,
    ruleVersion: z.string().min(1),
  })
  .strip();

export type InsightDto = z.infer<typeof insightDtoSchema>;

export const insightsResponseDtoSchema = z
  .object({
    day: dayKeySchema,
    count: z.number().int().nonnegative(),
    items: z.array(insightDtoSchema),
  })
  .strip();

export type InsightsResponseDto = z.infer<typeof insightsResponseDtoSchema>;

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
        bySeverity: z.object({
          info: z.number().int().nonnegative(),
          warning: z.number().int().nonnegative(),
          critical: z.number().int().nonnegative(),
        }),
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
