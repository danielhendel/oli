import type { DayKey } from "@/lib/ui/calendar/types";
import { addCalendarDaysToDayKey, enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

/**
 * Inclusive trailing window of local calendar days ending on `endDay`, length `dayCount`.
 * Uses the same UTC-noon day arithmetic as {@link enumerateDaysInclusive} (repo standard).
 */
export function activityTrailingNDaysInclusive(endDay: DayKey, dayCount: number): DayKey[] {
  if (dayCount <= 0) return [];
  const start = addCalendarDaysToDayKey(endDay, -(dayCount - 1));
  return enumerateDaysInclusive(start, endDay);
}

/** Apple-aligned overview row: average over these trailing day counts (inclusive of today). */
export const ACTIVITY_OVERVIEW_AVG_7D_DAYS = 7;
export const ACTIVITY_OVERVIEW_AVG_30D_DAYS = 30;
/** Rolling “12 months” ≈ 365 local days including today (deterministic; matches common Health rolling-year summaries). */
export const ACTIVITY_OVERVIEW_AVG_12M_DAYS = 365;

/**
 * Days fetched for calendar month markers (~18 months back from today).
 * Must cover visible months in the Activity calendar FlatList (−12 … +12 from current month).
 */
export const ACTIVITY_CALENDAR_MARKER_SPAN_DAYS = 540;

/**
 * GET /users/me/daily-facts keys for the Activity overview screen.
 *
 * Exactly the deduped union of trailing windows **ending on `overviewAnchorDay`** (strip-selected day):
 * Today row + 7D + 30D + 365D ⊆ one {@link ACTIVITY_OVERVIEW_AVG_12M_DAYS}-day inclusive trail.
 * No dates after `overviewAnchorDay`, and no extra history outside that trail (no full week union).
 */
export function computeActivityOverviewFetchDayKeys(overviewAnchorDay: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(overviewAnchorDay, ACTIVITY_OVERVIEW_AVG_12M_DAYS).sort();
}

/** Keys to mark days with steps on the Activity full-calendar screen. */
export function computeActivityCalendarFetchDayKeys(todayDayKey: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_CALENDAR_MARKER_SPAN_DAYS);
}
