import { SLEEP_NIGHT_RANGE_MAX_DAYS } from "@oli/contracts";
import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { addCalendarDaysToDayKey, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Re-export API policy max for SleepNight range client chunking. */
export { SLEEP_NIGHT_RANGE_MAX_DAYS };

/**
 * Union of sleep-night keys for the Sleep overview screen: baseline windows, selected strip week,
 * and today (for strip future-day handling).
 */
export function computeSleepOverviewFetchDayKeys(
  stripSelectedDay: DayKey,
  todayDayKey: DayKey,
): DayKey[] {
  const overviewEnd = getActivityOverviewAnchorEndDay(todayDayKey);
  const trail = activityTrailingNDaysInclusive(
    overviewEnd,
    ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  );
  const ytd = activityYtdInclusiveThroughEndDay(todayDayKey);
  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const d30 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
  const d90 = activityTrailingNDaysInclusive(overviewEnd, 90);
  const stripWeek = getWeekDaysForAnchor(stripSelectedDay);
  const set = new Set<DayKey>([...trail, ...ytd, ...d7, ...d30, ...d90, todayDayKey, ...stripWeek]);
  if (stripSelectedDay > todayDayKey) {
    set.add(stripSelectedDay);
  }
  return [...set].sort();
}

/**
 * Subset of {@link computeSleepOverviewFetchDayKeys} that drives the **Sleep Baseline** card
 * windows only — 7 / 30 / 90 / YTD / 12 Month. Future days (`day > todayDayKey`) are excluded so
 * the per-window readiness selector in the screen hook doesn't wait on cells the rollup will
 * never request.
 *
 * Pure helper — no `useMemo`, no Firebase, no API. Caller memoizes.
 */
export function computeSleepBaselineFetchDayKeys(todayDayKey: DayKey): DayKey[] {
  const overviewEnd = getActivityOverviewAnchorEndDay(todayDayKey);
  const trail = activityTrailingNDaysInclusive(
    overviewEnd,
    ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  );
  const ytd = activityYtdInclusiveThroughEndDay(todayDayKey);
  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const d30 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
  const d90 = activityTrailingNDaysInclusive(overviewEnd, 90);
  const set = new Set<DayKey>([...trail, ...ytd, ...d7, ...d30, ...d90]);
  return [...set].filter((d) => d <= todayDayKey).sort();
}

export type SleepNightRangeFetchWindow = {
  start: DayKey;
  end: DayKey;
};

/**
 * Split an inclusive calendar span covering `dayKeys` into contiguous windows of at most
 * {@link SLEEP_NIGHT_RANGE_MAX_DAYS} days for `GET /users/me/sleep-nights`.
 * Uses min→max of the requested keys (sparse response; missing days omitted server-side).
 */
export function sleepNightRangeFetchWindows(
  dayKeys: readonly DayKey[],
  maxDays: number = SLEEP_NIGHT_RANGE_MAX_DAYS,
): SleepNightRangeFetchWindow[] {
  if (dayKeys.length === 0) return [];
  if (maxDays < 1) {
    throw new Error("sleepNightRangeFetchWindows: maxDays must be >= 1");
  }
  const sorted = [...dayKeys].sort();
  const rangeStart = sorted[0]!;
  const rangeEnd = sorted[sorted.length - 1]!;
  const windows: SleepNightRangeFetchWindow[] = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const tentativeEnd = addCalendarDaysToDayKey(cursor, maxDays - 1);
    const end = tentativeEnd < rangeEnd ? tentativeEnd : rangeEnd;
    windows.push({ start: cursor, end });
    if (end >= rangeEnd) break;
    cursor = addCalendarDaysToDayKey(end, 1);
  }
  return windows;
}
