import type { DayKey } from "@/lib/ui/calendar/types";
import {
  enumerateDaysInclusive,
  getMonthFirstDay,
  getWeekDaysForAnchor,
} from "@/lib/ui/calendar/dateUtils";

/**
 * Calendar windows for Activity Overview rows (Today / This Week / MTD / YTD).
 * All bounds are inclusive day keys in device-neutral UTC-noon calendar math (same as Strength).
 */

export function activityWeekElapsedDaysThrough(selectedDay: DayKey): DayKey[] {
  return getWeekDaysForAnchor(selectedDay).filter((d) => d <= selectedDay);
}

export function activityMtdDaysThrough(selectedDay: DayKey): DayKey[] {
  const year = Number(selectedDay.slice(0, 4));
  const month = Number(selectedDay.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return [];
  const monthStart = getMonthFirstDay({ year, month });
  if (monthStart > selectedDay) return [];
  return enumerateDaysInclusive(monthStart, selectedDay);
}

export function activityYtdDaysThrough(selectedDay: DayKey): DayKey[] {
  const year = selectedDay.slice(0, 4);
  if (year.length !== 4) return [];
  const yearStart = `${year}-01-01` as DayKey;
  if (yearStart > selectedDay) return [];
  return enumerateDaysInclusive(yearStart, selectedDay);
}

/**
 * Unique sorted day keys to fetch via GET /users/me/daily-facts (union of week ∪ MTD ∪ YTD windows).
 */
export function computeActivityOverviewFetchDayKeys(selectedDay: DayKey): DayKey[] {
  const u = new Set<DayKey>([
    ...activityWeekElapsedDaysThrough(selectedDay),
    ...activityMtdDaysThrough(selectedDay),
    ...activityYtdDaysThrough(selectedDay),
  ]);
  return [...u].sort();
}
