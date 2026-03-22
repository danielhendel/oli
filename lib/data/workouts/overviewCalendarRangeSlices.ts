import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Lexicographic min/max — valid for ISO `YYYY-MM-DD` day keys. */
export function minDayKey(a: DayKey, b: DayKey): DayKey {
  return a <= b ? a : b;
}

export function maxDayKey(a: DayKey, b: DayKey): DayKey {
  return a >= b ? a : b;
}

export function overviewSharedRangeBounds(args: {
  weekStart: DayKey;
  weekEnd: DayKey;
  recentStart: DayKey;
  recentEnd: DayKey;
  analyticsStart: DayKey;
  analyticsEnd: DayKey;
}): { start: DayKey; end: DayKey } {
  const start = minDayKey(
    minDayKey(args.weekStart, args.recentStart),
    args.analyticsStart,
  );
  const end = maxDayKey(maxDayKey(args.weekEnd, args.recentEnd), args.analyticsEnd);
  return { start, end };
}

/** Inclusive day-key filter; `days` must be sorted by `day` ascending (same as calendar hydrate). */
export function filterWorkoutCalendarDaysInclusive<T extends WorkoutCalendarDayLike>(
  days: readonly T[],
  rangeStart: DayKey,
  rangeEnd: DayKey,
): T[] {
  if (days.length === 0) return [];
  const out: T[] = [];
  for (const d of days) {
    if (d.day < rangeStart) continue;
    if (d.day > rangeEnd) break;
    out.push(d);
  }
  return out;
}
