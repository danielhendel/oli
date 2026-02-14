// lib/contracts/healthSignals.ts
// Phase 1.5 Sprint 4 — Health Signals v1 (derived truth contract)

import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

export const healthSignalStatusSchema = z.enum(["stable", "attention_required"]);
export type HealthSignalStatus = z.infer<typeof healthSignalStatusSchema>;

export const healthSignalReadinessSchema = z.enum([
  "missing",
  "partial",
  "ready",
  "error",
]);
export type HealthSignalReadiness = z.infer<typeof healthSignalReadinessSchema>;

const thresholdsSchema = z
  .object({
    compositeAttentionLt: z.number(),
    domainAttentionLt: z.number(),
    deviationAttentionPctLt: z.number(),
  })
  .strip();

const domainEvidenceSchema = z.object({
  score: z.number(),
  baselineMean: z.number(),
  deviationPct: z.number().nullable(),
});

export const healthSignalInputsSchema = z
  .object({
    healthScoreDayKey: dayKeySchema,
    baselineWindowDays: z.number().int().nonnegative(),
    baselineDaysPresent: z.number().int().nonnegative(),
    thresholds: thresholdsSchema,
  })
  .strip();

const domainEvidenceRecordSchema = z
  .object({
    recovery: domainEvidenceSchema,
    training: domainEvidenceSchema,
    nutrition: domainEvidenceSchema,
    body: domainEvidenceSchema,
  })
  .strip();

/**
 * Health Signal document schema (users/{uid}/healthSignals/{dayKey}).
 * Server-computed only; client read-only.
 */
export const healthSignalDocSchema = z
  .object({
    schemaVersion: z.literal(1),
    modelVersion: z.literal("1.0"),
    date: dayKeySchema,
    status: healthSignalStatusSchema,
    readiness: healthSignalReadinessSchema,
    computedAt: isoString,
    pipelineVersion: z.number().int().positive(),
    inputs: healthSignalInputsSchema,
    reasons: z.array(z.string()),
    missingInputs: z.array(z.string()),
    domainEvidence: domainEvidenceRecordSchema,
  })
  .strip();

export type HealthSignalDoc = z.infer<typeof healthSignalDocSchema>;
export type HealthSignalInputs = z.infer<typeof healthSignalInputsSchema>;
export type HealthSignalDomainEvidence = z.infer<typeof domainEvidenceRecordSchema>;
