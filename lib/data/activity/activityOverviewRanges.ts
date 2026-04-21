import type { DayKey } from "@/lib/ui/calendar/types";
import {
  addCalendarDaysToDayKey,
  enumerateDaysInclusive,
  getWeekDaysForAnchor,
} from "@/lib/ui/calendar/dateUtils";

/**
 * Inclusive trailing window of local calendar days ending on `endDay`, length `dayCount`.
 * Uses the same UTC-noon day arithmetic as {@link enumerateDaysInclusive} (repo standard).
 */
export function activityTrailingNDaysInclusive(endDay: DayKey, dayCount: number): DayKey[] {
  if (dayCount <= 0) return [];
  const start = addCalendarDaysToDayKey(endDay, -(dayCount - 1));
  return enumerateDaysInclusive(start, endDay);
}

/** Trailing 7-day overview row (inclusive of effective anchor day). */
export const ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT = 7;
/** Trailing 30-day overview row (inclusive of effective anchor day). */
export const ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT = 30;
/**
 * Activity Baseline card: **90 completed local calendar days**, inclusive of the
 * **last completed day** (local yesterday from {@link getActivityOverviewAnchorEndDay}) and
 * **never including device today**. Same `DayKey` space as the rest of Activity (`getTodayDayKeyLocal` + repo day arithmetic).
 */
export const ACTIVITY_BASELINE_TRAILING_DAY_COUNT = 90;
/** “12 Month” = 365 trailing local days inclusive of effective anchor day. */
export const ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT = 365;

/**
 * Local-calendar year-to-date through `endDay`: Jan 1 of `endDay`'s year → `endDay`, inclusive.
 */
export function activityYtdInclusiveThroughEndDay(endDay: DayKey): DayKey[] {
  const year = endDay.slice(0, 4);
  const jan1 = `${year}-01-01` as DayKey;
  return enumerateDaysInclusive(jan1, endDay);
}

/**
 * Completed-day anchor for Activity **Overview** windows (7 / 30 / YTD / 12 Month).
 * Always local yesterday so trailing windows never depend on partial or missing “today” rollups.
 */
export function getActivityOverviewAnchorEndDay(todayDayKey: DayKey): DayKey {
  return addCalendarDaysToDayKey(todayDayKey, -1);
}

/**
 * GET /users/me/daily-facts keys for the Activity overview screen.
 *
 * Union of:
 * - trailing {@link ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT} days and YTD keys through
 *   {@link getActivityOverviewAnchorEndDay} (yesterday — stable completed history for Overview),
 * - **always** `todayDayKey` for the live Today’s Steps card,
 * - the 7 strip days around `overviewStripSelectedDay` so the weekly strip can render regardless of anchor,
 * - `overviewStripSelectedDay` when it is after `todayDayKey` (future strip selection still fetchable).
 */
export function computeActivityOverviewFetchDayKeys(
  overviewStripSelectedDay: DayKey,
  todayDayKey: DayKey,
): DayKey[] {
  const overviewEnd = getActivityOverviewAnchorEndDay(todayDayKey);
  const trail = activityTrailingNDaysInclusive(overviewEnd, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
  const ytd = activityYtdInclusiveThroughEndDay(overviewEnd);
  const stripWeek = getWeekDaysForAnchor(overviewStripSelectedDay);
  const set = new Set<DayKey>([...trail, ...ytd, todayDayKey, ...stripWeek]);
  if (overviewStripSelectedDay > todayDayKey) {
    set.add(overviewStripSelectedDay);
  }
  return [...set].sort();
}

/** Keys to mark days with steps on the Activity full-calendar screen. */
export const ACTIVITY_CALENDAR_MARKER_SPAN_DAYS = 540;

export function computeActivityCalendarFetchDayKeys(todayDayKey: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_CALENDAR_MARKER_SPAN_DAYS);
}
