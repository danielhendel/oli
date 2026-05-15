/**
 * Build Firestore merge payload for `users/{uid}/sleepNights/{anchorDay}` from an Oura sleep API doc.
 */

import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";

import {
  pickOuraSleepAverageHrvMs,
  pickOuraSleepLowestHeartRateBpm,
} from "./ouraSleepPhysiology";
import {
  normalizeOuraLatencyRawToMinutes,
  resolveOuraSleepIngestBase,
  type OuraSleepWindowDocument,
} from "./resolveOuraSleepIngestBase";

export type SleepNightBuildContext = {
  /** Oura sleep document id (matches `users/{uid}/ouraVendorSleep/{id}` when present). */
  sourceDocumentId: string;
};

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
      out[k] = stripUndefined(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Coerce Oura sleep score / composite_score (number or digit string) to 0–100 integer.
 */
export function coerceOuraSleepScore0to100(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.round(Math.max(0, Math.min(100, raw)));
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.max(0, Math.min(100, n)));
  }
  return null;
}

/**
 * Build Firestore merge payload for `users/{uid}/sleepNights/{anchorDay}`.
 * Returns null when bed/wake cannot be resolved (same gate as ingest).
 */
export function buildSleepNightFromOuraSleepDocument(
  doc: OuraSleepWindowDocument,
  ctx: SleepNightBuildContext,
): { anchorDay: string; merge: Record<string, unknown> } | null {
  const resolved = resolveOuraSleepIngestBase(doc);
  if (!resolved) return null;

  const { start, end, rollupDay: anchorDay } = resolved;
  const wakeDay = localCalendarDayKeyFromIsoInTimeZone(end, "UTC") ?? toYmd(end);

  const totalSec = typeof doc.total_sleep_duration === "number" ? doc.total_sleep_duration : null;
  const totalSleepMinutes = totalSec != null && totalSec >= 0 ? Math.round(totalSec / 60) : undefined;

  const remSec =
    typeof (doc as { rem_sleep_duration?: number }).rem_sleep_duration === "number"
      ? (doc as { rem_sleep_duration: number }).rem_sleep_duration
      : null;
  const remMinutes = remSec != null && remSec >= 0 ? Math.round(remSec / 60) : undefined;

  const deepSec =
    typeof (doc as { deep_sleep_duration?: number }).deep_sleep_duration === "number"
      ? (doc as { deep_sleep_duration: number }).deep_sleep_duration
      : null;
  const deepMinutes = deepSec != null && deepSec >= 0 ? Math.round(deepSec / 60) : undefined;

  const efficiencyRaw = doc.efficiency;
  const efficiency =
    typeof efficiencyRaw === "number" && Number.isFinite(efficiencyRaw) && efficiencyRaw >= 0 && efficiencyRaw <= 100
      ? efficiencyRaw
      : undefined;

  const latencyRaw = doc.latency;
  const latencyMinutes =
    typeof latencyRaw === "number" && Number.isFinite(latencyRaw) && latencyRaw >= 0
      ? normalizeOuraLatencyRawToMinutes(latencyRaw)
      : undefined;

  const score = coerceOuraSleepScore0to100(
    (doc as { score?: unknown }).score ?? (doc as { composite_score?: unknown }).composite_score,
  );

  let remPercent: number | undefined;
  let deepPercent: number | undefined;
  if (typeof totalSleepMinutes === "number" && totalSleepMinutes > 0) {
    if (typeof remMinutes === "number" && remMinutes >= 0) {
      remPercent = Math.round((remMinutes / totalSleepMinutes) * 100);
    }
    if (typeof deepMinutes === "number" && deepMinutes >= 0) {
      deepPercent = Math.round((deepMinutes / totalSleepMinutes) * 100);
    }
  }

  const mainSleepMinutes = typeof totalSleepMinutes === "number" ? totalSleepMinutes : undefined;

  const hasDuration =
    (typeof totalSleepMinutes === "number" && totalSleepMinutes > 0) ||
    (typeof mainSleepMinutes === "number" && mainSleepMinutes > 0);
  const hasWakeOrEnd = typeof wakeDay === "string" && wakeDay.length > 0 && typeof end === "string";
  const isComplete = Boolean(anchorDay && hasWakeOrEnd && hasDuration);

  const base: Record<string, unknown> = {
    anchorDay,
    wakeDay,
    provider: "oura",
    source: "ouraVendorSleep",
    sourceDocumentId: ctx.sourceDocumentId,
    isComplete,
    startedAt: start,
    endedAt: end,
  };

  if (typeof totalSleepMinutes === "number") base.totalSleepMinutes = totalSleepMinutes;
  if (typeof mainSleepMinutes === "number") base.mainSleepMinutes = mainSleepMinutes;
  if (efficiency !== undefined) base.efficiency = efficiency;
  if (typeof remMinutes === "number") base.remMinutes = remMinutes;
  if (typeof remPercent === "number") base.remPercent = remPercent;
  if (typeof deepMinutes === "number") base.deepMinutes = deepMinutes;
  if (typeof deepPercent === "number") base.deepPercent = deepPercent;
  if (typeof latencyMinutes === "number") base.latencyMinutes = latencyMinutes;
  if (score != null) base.score = score;

  const lowestHeartRateBpm = pickOuraSleepLowestHeartRateBpm(doc);
  const averageHrvMs = pickOuraSleepAverageHrvMs(doc);
  if (lowestHeartRateBpm !== undefined) base.lowestHeartRateBpm = lowestHeartRateBpm;
  if (averageHrvMs !== undefined) base.averageHrvMs = averageHrvMs;
  if (lowestHeartRateBpm !== undefined || averageHrvMs !== undefined) {
    base.physiologySource = "oura_sleep_doc";
  }

  return { anchorDay, merge: stripUndefined(base) };
}
