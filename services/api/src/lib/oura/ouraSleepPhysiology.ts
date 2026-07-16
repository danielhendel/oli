/**
 * Nightly lowest HR and average HRV from Oura API v2 sleep documents
 * (`GET /v2/usercollection/sleep` — `lowest_heart_rate`, `average_hrv`).
 * Matches Oura app sleep summary; not derived from heartrate/HRV time series.
 */

import type { OuraSleepWindowDocument } from "./resolveOuraSleepIngestBase";

function coerceOptionalNumber(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Top-level vendor/API row, then nested `payload` when present. */
export function sleepRecordsForPick(raw: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [raw];
  const payload = raw.payload;
  if (
    payload != null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.getPrototypeOf(payload) === Object.prototype
  ) {
    out.push(payload as Record<string, unknown>);
  }
  return out;
}

/** Lowest heart rate (bpm) from Oura sleep period document only. */
export function pickOuraSleepLowestHeartRateBpm(
  doc: OuraSleepWindowDocument | Record<string, unknown>,
): number | undefined {
  for (const src of sleepRecordsForPick(doc as Record<string, unknown>)) {
    for (const key of ["lowest_heart_rate", "lowestHeartRateBpm"] as const) {
      const n = coerceOptionalNumber(src[key]);
      if (n != null && n >= 30 && n <= 220) return Math.round(n);
    }
  }
  return undefined;
}

/** Average HRV (ms) from Oura sleep `average_hrv` / `averageHrvMs` only — no RMSSD inference. */
export function pickOuraSleepAverageHrvMs(
  doc: OuraSleepWindowDocument | Record<string, unknown>,
): number | undefined {
  for (const src of sleepRecordsForPick(doc as Record<string, unknown>)) {
    for (const key of ["average_hrv", "averageHrvMs"] as const) {
      const n = coerceOptionalNumber(src[key]);
      if (n != null && n >= 0) return Math.round(n);
    }
  }
  return undefined;
}

/** @deprecated Use pickOuraSleepLowestHeartRateBpm */
export const pickLowestHeartRateBpmFromOuraSleepDoc = pickOuraSleepLowestHeartRateBpm;

/** @deprecated Use pickOuraSleepAverageHrvMs */
export const pickAverageHrvMsFromOuraSleepDoc = pickOuraSleepAverageHrvMs;

export type OuraSleepPhysiologyDebug = {
  uid?: string;
  day: string;
  sourceEndpoint: string;
  sleepDocId: string;
  sleepDocKeys: string[];
  hasLowestHeartRate: boolean;
  lowestHeartRateRaw: unknown;
  hasAverageHrv: boolean;
  averageHrvRaw: unknown;
  start: string | null;
  end: string | null;
};

/**
 * Permanently disabled: previously env-gated debug telemetry logged uid, day,
 * document ids, and physiology fields. Environment gating is not privacy protection.
 * Call sites may remain; this function is a no-op.
 */
export function logOuraSleepPhysiologyDebugIfEnabled(debug: OuraSleepPhysiologyDebug): void {
  void debug;
  return;
}

/** Emit debug line for one Oura sleep API document (pull-now / snapshot write). */
export function logOuraSleepPhysiologyDebugForDoc(
  doc: OuraSleepWindowDocument | Record<string, unknown>,
  ctx: {
    uid?: string;
    day: string;
    sourceEndpoint?: string;
    sleepDocId: string;
    start?: string | null;
    end?: string | null;
  },
): void {
  const rec = doc as Record<string, unknown>;
  const payload =
    rec.payload != null && typeof rec.payload === "object" && !Array.isArray(rec.payload)
      ? (rec.payload as Record<string, unknown>)
      : null;
  const lowestRaw = rec.lowest_heart_rate ?? rec.lowestHeartRateBpm ?? payload?.lowest_heart_rate ?? payload?.lowestHeartRateBpm;
  const hrvRaw = rec.average_hrv ?? rec.averageHrvMs ?? payload?.average_hrv ?? payload?.averageHrvMs;
  logOuraSleepPhysiologyDebugIfEnabled({
    ...(ctx.uid != null ? { uid: ctx.uid } : {}),
    day: ctx.day,
    sourceEndpoint: ctx.sourceEndpoint ?? "GET /v2/usercollection/sleep",
    sleepDocId: ctx.sleepDocId,
    sleepDocKeys: Object.keys(rec).sort(),
    hasLowestHeartRate: pickOuraSleepLowestHeartRateBpm(doc) !== undefined,
    lowestHeartRateRaw: lowestRaw ?? null,
    hasAverageHrv: pickOuraSleepAverageHrvMs(doc) !== undefined,
    averageHrvRaw: hrvRaw ?? null,
    start: ctx.start ?? null,
    end: ctx.end ?? null,
  });
}
