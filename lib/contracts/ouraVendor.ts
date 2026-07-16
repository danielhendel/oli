/**
 * Oura vendor snapshot and view contracts — Tier 1 Sleep & Readiness.
 * Preserves Oura score + contributors for vendor-faithful screens.
 * Contributors stored as Record<string, unknown> (API shape may vary).
 */

import { z } from "zod";
import { dayKeySchema } from "./day";

const contributorsSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Oura / Firestore may expose sleep score as a JSON number or a digit string; normalize at the trust boundary.
 */
export const sleepViewScoreSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}, z.number().min(0).max(100).optional()) as z.ZodType<number | undefined>;

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
  lowestHeartRateBpm: z.number().int().min(30).max(220).optional(),
  averageHrvMs: z.number().min(0).max(50_000).optional(),
  /** Full Oura API sleep document for backfill / field recovery. */
  payload: z.record(z.string(), z.unknown()).optional(),
  /** Calendar-day Daily Sleep summary (score source); absent on period sleep docs. */
  kind: z.literal("daily_sleep").optional(),
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
  lowestHeartRateBpm: z.number().int().min(30).max(220).optional(),
  averageHrvMs: z.number().min(0).max(50_000).optional(),
});
export type OuraReadinessSnapshot = z.infer<typeof ouraReadinessSnapshotSchema>;

/** Sleep view for screen: snapshot + requested/resolved day and fallback flag. */
export const sleepViewDtoSchema = z.object({
  requestedDay: dayKeySchema,
  resolvedDay: dayKeySchema,
  isFallback: z.boolean(),
  day: dayKeySchema, // alias for resolvedDay (backward compat)
  sourceId: z.literal("oura").optional(),
  score: sleepViewScoreSchema,
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

/** Official PublicDailyStressSummary values (Oura API v2 daily_stress). */
export const OURA_DAILY_STRESS_SUMMARY_VALUES = ["restored", "normal", "stressful"] as const;
export type OuraDailyStressSummary = (typeof OURA_DAILY_STRESS_SUMMARY_VALUES)[number];
export const ouraDailyStressSummarySchema = z.enum(OURA_DAILY_STRESS_SUMMARY_VALUES);

/** Runtime provider document schema (Oura GET /v2/usercollection/daily_stress item). */
export const ouraDailyStressProviderDocumentSchema = z
  .object({
    id: z.string().min(1).optional(),
    day: dayKeySchema,
    day_summary: ouraDailyStressSummarySchema.nullable().optional(),
    stress_high: z.number().finite().nonnegative().nullable().optional(),
    recovery_high: z.number().finite().nonnegative().nullable().optional(),
  })
  .strip();

export type OuraDailyStressProviderDocument = z.infer<typeof ouraDailyStressProviderDocumentSchema>;

export function parseOuraDailyStressProviderDocument(
  raw: unknown,
): OuraDailyStressProviderDocument | null {
  const parsed = ouraDailyStressProviderDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Stored snapshot for one Oura daily_stress document (camelCase storage). */
export const ouraStressSnapshotSchema = z.object({
  id: z.string().min(1),
  day: dayKeySchema,
  daySummary: ouraDailyStressSummarySchema.nullable().optional(),
  stressHighSeconds: z.number().finite().nonnegative().nullable().optional(),
  recoveryHighSeconds: z.number().finite().nonnegative().nullable().optional(),
  source: z.literal("oura"),
  fetchedAt: z.string().min(1),
  updatedAt: z.string().min(1).optional(),
  schemaVersion: z.literal(1),
});
export type OuraStressSnapshot = z.infer<typeof ouraStressSnapshotSchema>;

/** Client DTO for one exact provider stress day (no storage metadata / raw payload). */
export const ouraDailyStressDayDtoSchema = z.object({
  day: dayKeySchema,
  daySummary: ouraDailyStressSummarySchema.nullable().optional(),
  stressHighSeconds: z.number().finite().nonnegative().nullable().optional(),
  recoveryHighSeconds: z.number().finite().nonnegative().nullable().optional(),
  source: z.literal("oura"),
});
export type OuraDailyStressDayDto = z.infer<typeof ouraDailyStressDayDtoSchema>;

/** Inclusive calendar-day span cap for GET /users/me/oura-stress range reads. */
export const OURA_STRESS_RANGE_MAX_DAYS = 90;

export const ouraStressRangeQuerySchema = z
  .object({
    start: dayKeySchema,
    end: dayKeySchema,
  })
  .strip();

export type OuraStressRangeQuery = z.infer<typeof ouraStressRangeQuerySchema>;

/**
 * Bounded range response: only exact provider days present in vendor snapshots
 * (missing days omitted — no fill, no Oura call).
 */
export const ouraStressRangeResponseDtoSchema = z.object({
  start: dayKeySchema,
  end: dayKeySchema,
  dayCount: z.number().int().positive(),
  resolvedCount: z.number().int().nonnegative(),
  days: z.array(ouraDailyStressDayDtoSchema),
});

export type OuraStressRangeResponseDto = z.infer<typeof ouraStressRangeResponseDtoSchema>;

/** Exact provider readiness day for bounded range reads (no fallback densification). */
export const ouraReadinessRangeDayDtoSchema = z.object({
  day: dayKeySchema,
  score: z.number().min(0).max(100).nullable().optional(),
  source: z.literal("oura"),
});
export type OuraReadinessRangeDayDto = z.infer<typeof ouraReadinessRangeDayDtoSchema>;

/** Inclusive calendar-day span cap for GET /users/me/oura-readiness-range. */
export const OURA_READINESS_RANGE_MAX_DAYS = 90;

export const ouraReadinessRangeQuerySchema = z
  .object({
    start: dayKeySchema,
    end: dayKeySchema,
  })
  .strip();

export type OuraReadinessRangeQuery = z.infer<typeof ouraReadinessRangeQuerySchema>;

/**
 * Bounded range response: only exact provider readiness days present in vendor
 * snapshots (missing days omitted — no fill, no fallback, no Oura call).
 */
export const ouraReadinessRangeResponseDtoSchema = z.object({
  start: dayKeySchema,
  end: dayKeySchema,
  dayCount: z.number().int().positive(),
  resolvedCount: z.number().int().nonnegative(),
  days: z.array(ouraReadinessRangeDayDtoSchema),
});

export type OuraReadinessRangeResponseDto = z.infer<typeof ouraReadinessRangeResponseDtoSchema>;
