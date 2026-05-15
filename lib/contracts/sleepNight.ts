/**
 * Canonical SleepNight read model — Firestore `users/{uid}/sleepNights/{anchorDay}` + GET /users/me/sleep-night.
 */

import { z } from "zod";

import { dayKeySchema } from "./day";

/** Coerce JSON number or digit string to 0–100 (matches vendor sleep score handling). */
export const sleepNightScoreSchema = z.preprocess((val) => {
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

/** Coerce JSON number or digit string to integer bpm (Oura lowest HR range). */
const sleepNightLowestHrBpmSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return Math.round(val);
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }
  return undefined;
}, z.number().int().min(30).max(220).optional()) as z.ZodType<number | undefined>;

/** Coerce JSON number or digit string to nightly HRV aggregate in ms (Oura readiness / vendor snapshot). */
const sleepNightAverageHrvMsSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return Math.round(val);
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }
  return undefined;
}, z.number().min(0).max(50_000).optional()) as z.ZodType<number | undefined>;

/**
 * Parsed SleepNight document (API omits undefined; optional fields may be absent).
 */
export const sleepNightDocumentSchema = z.object({
  anchorDay: dayKeySchema,
  wakeDay: dayKeySchema,
  provider: z.literal("oura"),
  source: z.literal("ouraVendorSleep"),
  sourceDocumentId: z.string().min(1),
  score: sleepNightScoreSchema,
  rating: z.string().min(1).optional(),
  totalSleepMinutes: z.number().nonnegative().optional(),
  mainSleepMinutes: z.number().nonnegative().optional(),
  efficiency: z.number().nonnegative().optional(),
  remMinutes: z.number().nonnegative().optional(),
  remPercent: z.number().min(0).max(100).optional(),
  deepMinutes: z.number().nonnegative().optional(),
  deepPercent: z.number().min(0).max(100).optional(),
  latencyMinutes: z.number().nonnegative().optional(),
  restfulnessLabel: z.string().min(1).optional(),
  timingLabel: z.string().min(1).optional(),
  isComplete: z.boolean(),
  startedAt: z.string().min(1).optional(),
  endedAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),
  /** From Oura sleep period and/or daily_readiness at ingest; not inferred on device. */
  lowestHeartRateBpm: sleepNightLowestHrBpmSchema.optional(),
  /** From Oura sleep `average_hrv` and/or daily_readiness aggregate (ms). */
  averageHrvMs: sleepNightAverageHrvMsSchema.optional(),
  /** Provenance when physiology was persisted at ingest. */
  physiologySource: z.enum(["oura_sleep_doc", "oura_readiness", "oura_time_series"]).optional(),
});

export type SleepNightDocumentDto = z.infer<typeof sleepNightDocumentSchema>;

export const sleepNightResolutionSchema = z.enum([
  "exact_anchor",
  "wake_day",
  "latest_completed_prior_night",
]);

export type SleepNightResolution = z.infer<typeof sleepNightResolutionSchema>;

export const sleepNightViewDtoSchema = z.object({
  requestedDay: dayKeySchema,
  anchorDay: dayKeySchema,
  wakeDay: dayKeySchema,
  resolution: sleepNightResolutionSchema,
  /** Physiological mapping is not a stale vendor fallback; always false for this route. */
  isFallback: z.literal(false),
  sleepNight: sleepNightDocumentSchema,
});

export type SleepNightViewDto = z.infer<typeof sleepNightViewDtoSchema>;
