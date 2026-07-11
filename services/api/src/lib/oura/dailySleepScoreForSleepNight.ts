/**
 * Join Oura Daily Sleep summary (calendar-day Sleep Score) onto SleepNight payloads.
 * Period `/sleep` docs supply duration/stages; `/daily_sleep` supplies the provider Sleep Score.
 */

import { coerceOuraSleepScore0to100 } from "./buildSleepNightFromOuraDocument";
import type { OuraDailySleepDocument } from "../ouraApi";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function dailySleepDayFromDoc(doc: OuraDailySleepDocument): string | null {
  if (typeof doc.day === "string" && DAY_KEY.test(doc.day.trim())) return doc.day.trim();
  if (typeof doc.timestamp === "string" && doc.timestamp.length >= 10) {
    const slice = doc.timestamp.slice(0, 10);
    return DAY_KEY.test(slice) ? slice : null;
  }
  return null;
}

export function scoreFromOuraDailySleepDoc(doc: OuraDailySleepDocument): number | null {
  const raw: unknown = doc.score;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw < 0 || raw > 100) return null;
    return Math.round(raw);
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return Math.round(n);
  }
  return null;
}

export function indexOuraDailySleepByDay(
  docs: OuraDailySleepDocument[] | undefined,
): Map<string, OuraDailySleepDocument> {
  const map = new Map<string, OuraDailySleepDocument>();
  if (!docs) return map;
  for (const doc of docs) {
    const day = dailySleepDayFromDoc(doc);
    if (day == null) continue;
    const existing = map.get(day);
    if (existing == null) {
      map.set(day, doc);
      continue;
    }
    // Prefer the row that actually has a score.
    if (scoreFromOuraDailySleepDoc(existing) == null && scoreFromOuraDailySleepDoc(doc) != null) {
      map.set(day, doc);
    }
  }
  return map;
}

/**
 * Prefer wake morning day, then anchor/rollup day, for Daily Sleep score alignment.
 */
export function findDailySleepDocForSleepNight(
  anchorDay: string,
  wakeDay: string | null,
  byDay: Map<string, OuraDailySleepDocument>,
): OuraDailySleepDocument | null {
  if (wakeDay != null && DAY_KEY.test(wakeDay)) {
    const byWake = byDay.get(wakeDay);
    if (byWake != null) return byWake;
  }
  if (DAY_KEY.test(anchorDay)) {
    const byAnchor = byDay.get(anchorDay);
    if (byAnchor != null) return byAnchor;
  }
  return null;
}

/**
 * Fill `score` on a SleepNight merge payload from Daily Sleep when the period doc lacked it.
 * Does not overwrite an existing finite 0–100 score.
 */
export function mergeDailySleepScoreIntoSleepNightPayload(
  merge: Record<string, unknown>,
  dailySleepDocs: OuraDailySleepDocument[] | undefined,
): { merged: boolean; scoreDay: string | null } {
  const existing = coerceOuraSleepScore0to100(merge.score);
  if (existing != null) {
    return { merged: false, scoreDay: null };
  }
  const anchorDay = typeof merge.anchorDay === "string" ? merge.anchorDay : "";
  const wakeDay = typeof merge.wakeDay === "string" ? merge.wakeDay : null;
  const doc = findDailySleepDocForSleepNight(anchorDay, wakeDay, indexOuraDailySleepByDay(dailySleepDocs));
  if (doc == null) return { merged: false, scoreDay: null };
  const score = scoreFromOuraDailySleepDoc(doc);
  if (score == null) return { merged: false, scoreDay: null };
  merge.score = score;
  const scoreDay = dailySleepDayFromDoc(doc);
  return { merged: true, scoreDay };
}
