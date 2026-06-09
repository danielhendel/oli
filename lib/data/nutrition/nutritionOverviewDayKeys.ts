import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";

/** Unique sorted day keys for nutrition overview daily-facts rollup (deduped). */
export function nutritionOverviewFactsDayKeys(input: {
  todayDayKey: DayKey;
  weekAnchorDay: DayKey;
}): DayKey[] {
  const { todayDayKey, weekAnchorDay } = input;
  const set = new Set<DayKey>();

  for (const d of activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT)) {
    set.add(d);
  }

  for (const d of getWeekDaysForAnchor(weekAnchorDay)) {
    set.add(d);
  }

  return [...set].sort();
}

export function weekBoundsForAnchor(anchorDay: DayKey): { weekStart: DayKey; weekEnd: DayKey } {
  const days = getWeekDaysForAnchor(anchorDay);
  return { weekStart: days[0]!, weekEnd: days[6]! };
}

export function trailing7ThroughToday(todayDayKey: DayKey): { rangeStart: DayKey; rangeEnd: DayKey } {
  const keys = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  return { rangeStart: keys[0]!, rangeEnd: todayDayKey };
}

export function trailing30ThroughToday(todayDayKey: DayKey): { rangeStart: DayKey; rangeEnd: DayKey } {
  const keys = activityTrailingNDaysInclusive(todayDayKey, 30);
  return { rangeStart: keys[0]!, rangeEnd: todayDayKey };
}

export function trailing90ThroughYesterday(todayDayKey: DayKey): { rangeStart: DayKey; rangeEnd: DayKey } {
  const anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey);
  const keys = activityTrailingNDaysInclusive(anchorYesterday, 90);
  return { rangeStart: keys[0]!, rangeEnd: anchorYesterday };
}

export function ytdThroughToday(todayDayKey: DayKey): { rangeStart: DayKey; rangeEnd: DayKey } {
  const ytdStart = `${todayDayKey.slice(0, 4)}-01-01` as DayKey;
  return { rangeStart: ytdStart, rangeEnd: todayDayKey };
}

export function trailing365ThroughToday(todayDayKey: DayKey): { rangeStart: DayKey; rangeEnd: DayKey } {
  const keys = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
  return { rangeStart: keys[0]!, rangeEnd: todayDayKey };
}

export function daysInRange(rangeStart: DayKey, rangeEnd: DayKey): DayKey[] {
  return enumerateDaysInclusive(rangeStart, rangeEnd);
}
