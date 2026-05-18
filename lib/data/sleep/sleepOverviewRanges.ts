import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

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
