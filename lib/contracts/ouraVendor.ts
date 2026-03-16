/**
 * Oura vendor snapshot and view contracts — Tier 1 Sleep & Readiness.
 * Preserves Oura score + contributors for vendor-faithful screens.
 * Contributors stored as Record<string, unknown> (API shape may vary).
 */

import { z } from "zod";
import { dayKeySchema } from "./day";

const contributorsSchema = z.record(z.string(), z.unknown()).optional();

/** Stored snapshot for one Oura sleep document (score + contributors + display fields). */
export const ouraSleepSnapshotSchema = z.object({
  id: z.string().min(1),
  day: dayKeySchema,
  score: z.number().min(0).max(100).nullable().optional(),
  contributors: contributorsSchema,
  source: z.literal("oura"),
  fetchedAt: z.string().min(1),
  updatedAt: z.string().min(1).optional(),
  // Display-safe fields from Oura API (optional)
  totalSleepDuration: z.number().optional(),
  efficiency: z.number().optional(),
  latency: z.number().optional(),
  restfulSleep: z.number().optional(),
  remSleep: z.number().optional(),
  deepSleep: z.number().optional(),
});
export type OuraSleepSnapshot = z.infer<typeof ouraSleepSnapshotSchema>;

/** Stored snapshot for one Oura daily_readiness document. */
export const ouraReadinessSnapshotSchema = z.object({
  id: z.string().min(1),
  day: dayKeySchema,
  score: z.number().min(0).max(100).nullable().optional(),
  contributors: contributorsSchema,
  source: z.literal("oura"),
  fetchedAt: z.string().min(1),
  updatedAt: z.string().min(1).optional(),
});
export type OuraReadinessSnapshot = z.infer<typeof ouraReadinessSnapshotSchema>;

/** Sleep view for screen: snapshot + requested/resolved day and fallback flag. */
export const sleepViewDtoSchema = z.object({
  requestedDay: dayKeySchema,
  resolvedDay: dayKeySchema,
  isFallback: z.boolean(),
  day: dayKeySchema, // alias for resolvedDay (backward compat)
  sourceId: z.literal("oura").optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  contributors: contributorsSchema,
  totalMinutes: z.number().optional(),
  efficiency: z.number().optional(),
  latencyMinutes: z.number().optional(),
  awakenings: z.number().optional(),
  restfulSleep: z.number().optional(),
  remSleep: z.number().optional(),
  deepSleep: z.number().optional(),
  fetchedAt: z.string().optional(),
});
export type SleepViewDto = z.infer<typeof sleepViewDtoSchema>;

/** Readiness view for screen. */
export const readinessViewDtoSchema = z.object({
  requestedDay: dayKeySchema,
  resolvedDay: dayKeySchema,
  isFallback: z.boolean(),
  day: dayKeySchema, // alias for resolvedDay (backward compat)
  sourceId: z.literal("oura").optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  contributors: contributorsSchema,
  fetchedAt: z.string().optional(),
});
export type ReadinessViewDto = z.infer<typeof readinessViewDtoSchema>;
