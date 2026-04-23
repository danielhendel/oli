/**
 * Shared limits and pure helpers for workout summary rebuild APIs (day/month ranges).
 * Used by Zod schemas in retrieval.ts and by Cloud Functions bundle code via `lib/data/workouts/workoutSummaryRebuildPolicy`.
 */

/** Inclusive calendar-day span cap for GET/POST workout day summary ranges. */
export const WORKOUT_DAY_SUMMARY_REBUILD_MAX_DAYS = 900;

/** Inclusive month span cap for POST workout month summary rebuild-range. */
export const WORKOUT_MONTH_SUMMARY_REBUILD_RANGE_MAX_MONTHS = 24;

export function countInclusiveCalendarDays(start: string, end: string): number {
  if (start > end) return 0;
  const ps = start.split("-");
  const pe = end.split("-");
  if (ps.length !== 3 || pe.length !== 3) return 0;
  const ys = Number(ps[0]);
  const ms = Number(ps[1]);
  const ds = Number(ps[2]);
  const ye = Number(pe[0]);
  const me = Number(pe[1]);
  const de = Number(pe[2]);
  if ([ys, ms, ds, ye, me, de].some((x) => !Number.isFinite(x))) return 0;
  const t0 = Date.UTC(ys, ms - 1, ds);
  const t1 = Date.UTC(ye, me - 1, de);
  const diffDays = Math.round((t1 - t0) / 86400000);
  return diffDays >= 0 ? diffDays + 1 : 0;
}

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

/** Enumerate YYYY-MM keys from start through end (inclusive). Empty if invalid or start > end. */
export function enumerateMonthKeysInclusive(startMonthKey: string, endMonthKey: string): string[] {
  if (!MONTH_KEY_RE.test(startMonthKey) || !MONTH_KEY_RE.test(endMonthKey)) return [];
  if (startMonthKey > endMonthKey) return [];
  let y = Number(startMonthKey.slice(0, 4));
  let m = Number(startMonthKey.slice(5, 7));
  const endY = Number(endMonthKey.slice(0, 4));
  const endM = Number(endMonthKey.slice(5, 7));
  const out: string[] = [];
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
