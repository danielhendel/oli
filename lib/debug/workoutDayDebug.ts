import type { DayKey } from "@/lib/ui/calendar/types";
import { observedAtPadDaysForWorkoutCalendarRange } from "@/lib/data/workouts/workoutsCalendarObservedAtPad";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

/**
 * Frozen audit dates (device run): logs only when hydrate / UI touches these calendar days.
 * Replace or extend for other investigations.
 */
export const WORKOUT_DAY_DEBUG_DATES = [
  "2026-03-22",
  "2026-03-23",
  "2026-03-24",
  "2026-03-25",
  "2026-03-27",
] as const satisfies readonly DayKey[];

const DEBUG_SET = new Set<string>(WORKOUT_DAY_DEBUG_DATES);

export function workoutDayDebugEnabled(): boolean {
  return __DEV__ && !process.env.JEST_WORKER_ID;
}

export function isWorkoutDayDebugDate(day: DayKey): boolean {
  return DEBUG_SET.has(day);
}

/** True if [start,end] inclusive overlaps any debug day. */
export function workoutDayDebugRangeOverlaps(start: DayKey, end: DayKey): boolean {
  if (start > end) return false;
  for (const d of WORKOUT_DAY_DEBUG_DATES) {
    if (d >= start && d <= end) return true;
  }
  return false;
}

function payloadDayHints(payload: unknown): string[] {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return [];
  const p = payload as Record<string, unknown>;
  const out: string[] = [];
  if (typeof p.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.day)) out.push(p.day);
  for (const k of ["startedAt", "start", "time"] as const) {
    const v = p[k];
    if (typeof v === "string" && v.length >= 10) out.push(v.slice(0, 10));
  }
  return out;
}

/**
 * Log this raw-events list row when it may relate to a debug day (derived key, observedAt UTC date, or payload hints).
 */
export function workoutDayDebugRowTouchesAuditDates(args: {
  observedAt: string;
  payload: unknown;
  derivedDayKey: DayKey | null;
}): boolean {
  if (!workoutDayDebugEnabled()) return false;
  const { observedAt, payload, derivedDayKey } = args;
  if (derivedDayKey && DEBUG_SET.has(derivedDayKey)) return true;
  const o = observedAt.slice(0, 10);
  if (DEBUG_SET.has(o)) return true;
  for (const h of payloadDayHints(payload)) {
    if (DEBUG_SET.has(h)) return true;
  }
  return false;
}

export function logWorkoutDayDebug(tag: string, payload: Record<string, unknown>): void {
  if (!workoutDayDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[WORKOUT_DAY_DEBUG] ${tag}`, payload);
}

export function workoutDayDebugPayloadStartedAt(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const v = p.startedAt ?? p.start ?? null;
  return typeof v === "string" ? v : null;
}

/** Confirms current bundle includes single-day wide pad + expected fix revision. */
export function workoutDayDebugFixRevision(): {
  workoutDayDebugRevision: "2026-04-03";
  singleDayObservedAtPadDays: number;
  multiDayObservedAtPadDays: number;
} {
  const sample: DayKey = "2026-03-22";
  return {
    workoutDayDebugRevision: "2026-04-03",
    singleDayObservedAtPadDays: observedAtPadDaysForWorkoutCalendarRange(sample, sample),
    multiDayObservedAtPadDays: observedAtPadDaysForWorkoutCalendarRange(sample, "2026-03-23"),
  };
}

export function logWorkoutDayDebugJournalForDay(day: DayKey, rows: readonly ManualWorkoutDaySummary[]): void {
  if (!workoutDayDebugEnabled() || !isWorkoutDayDebugDate(day)) return;
  const slice = rows.filter((r) => r.day === day);
  logWorkoutDayDebug("journal-summaries-for-day", {
    requestedDay: day,
    matchingCompletedSummaries: slice.map((s) => ({
      sessionId: s.sessionId,
      day: s.day,
      startedAt: s.startedAt,
      customName: s.customName,
      exerciseCount: s.exercises.length,
      totalVolume: s.totalVolume,
    })),
    note: "Journal is AsyncStorage-backed; absence here means no completed local session for this day.",
  });
}
