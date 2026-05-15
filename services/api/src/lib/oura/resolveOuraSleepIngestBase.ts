/**
 * Shared Oura sleep window + rollup day resolution.
 * Used by API ingest, vendor snapshots, SleepNight build, and Cloud Functions post-raw.
 */

import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";

/** Minimal Oura v2 sleep document shape for resolution (matches services/api OuraSleepDocument fields used here). */
export type OuraSleepWindowDocument = Record<string, unknown> & {
  id?: string;
  day?: string;
  bed_time?: string;
  wake_time?: string;
  end_time?: string;
  bedtime_start?: string;
  bedtime_end?: string;
  start?: string;
  end?: string;
  total_sleep_duration?: number;
};

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

function isYmdDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getSleepStart(doc: OuraSleepWindowDocument): string | null {
  const s =
    doc.bed_time ??
    doc.bedtime_start ??
    doc.start ??
    doc.end_time ??
    doc.end ??
    null;
  return typeof s === "string" && s.length > 0 ? s : null;
}

function getSleepEnd(doc: OuraSleepWindowDocument): string | null {
  const e =
    doc.wake_time ??
    doc.bedtime_end ??
    doc.end ??
    doc.end_time ??
    null;
  return typeof e === "string" && e.length > 0 ? e : null;
}

/** Wake-time ISO for pull-now diagnostics (same field resolution as ingest). */
export function ouraSleepWakeIsoForLog(doc: OuraSleepWindowDocument): string | null {
  return getSleepEnd(doc);
}

/**
 * Align with GET /users/me/oura-sleep-view: Oura may return latency as seconds (typically ≥ 60);
 * smaller values are treated as minutes.
 */
export function normalizeOuraLatencyRawToMinutes(latencyRaw: number): number {
  return latencyRaw >= 60 ? Math.round(latencyRaw / 60) : Math.round(latencyRaw);
}

/**
 * Resolved sleep window + logical rollup day for Oura sleep docs.
 * Shared by raw-event ingest, vendor snapshots, and canonical SleepNight anchor day.
 */
export function resolveOuraSleepIngestBase(
  doc: OuraSleepWindowDocument,
): { start: string; end: string; rollupDay: string } | null {
  const start = getSleepStart(doc);
  let end = getSleepEnd(doc);
  const totalSec = typeof doc.total_sleep_duration === "number" ? doc.total_sleep_duration : 0;
  if (start && !end && totalSec > 0) {
    const startMs = Date.parse(start);
    if (!Number.isNaN(startMs)) {
      end = new Date(startMs + totalSec * 1000).toISOString();
    }
  }
  if (!start || !end) return null;

  const providerDay = typeof doc.day === "string" && isYmdDateString(doc.day) ? doc.day : null;
  const rollupDay =
    providerDay ?? localCalendarDayKeyFromIsoInTimeZone(end, "UTC") ?? toYmd(end);

  return { start, end, rollupDay };
}
