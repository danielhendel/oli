// lib/contracts/healthScore.ts
// Phase 1.5 Sprint 1 — Health Score Model v1.0 (derived truth contract)

import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

export const healthScoreTierSchema = z.enum(["excellent", "good", "fair", "poor"]);
export type HealthScoreTier = z.infer<typeof healthScoreTierSchema>;

export const healthScoreStatusSchema = z.enum([
  "stable",
  "attention_required",
  "insufficient_data",
]);
export type HealthScoreStatus = z.infer<typeof healthScoreStatusSchema>;

const domainScoreSchema = z
  .object({
    score: z.number().min(0).max(100),
    tier: healthScoreTierSchema,
    missing: z.array(z.string()),
  })
  .strip();

export const healthScoreDomainScoresSchema = z
  .object({
    recovery: domainScoreSchema,
    training: domainScoreSchema,
    nutrition: domainScoreSchema,
    body: domainScoreSchema,
  })
  .strip();

const inputsSummarySchema = z
  .object({
    hasDailyFacts: z.boolean(),
    historyDaysUsed: z.number().int().nonnegative(),
  })
  .strip();

/**
 * Health Score document schema (users/{uid}/healthScores/{dayKey}).
 * Server-computed only; client read-only.
 */
export const healthScoreDocSchema = z
  .object({
    schemaVersion: z.literal(1),
    modelVersion: z.literal("1.0"),
    date: dayKeySchema,
    compositeScore: z.number().min(0).max(100),
    compositeTier: healthScoreTierSchema,
    domainScores: healthScoreDomainScoresSchema,
    status: healthScoreStatusSchema,
    computedAt: isoString,
    pipelineVersion: z.number().int().positive(),
    inputs: inputsSummarySchema,
  })
  .strip();

export type HealthScoreDoc = z.infer<typeof healthScoreDocSchema>;
export type HealthScoreDomainScores = z.infer<typeof healthScoreDomainScoresSchema>;
