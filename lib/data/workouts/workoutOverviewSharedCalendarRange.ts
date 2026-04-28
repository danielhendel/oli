import { overviewSharedRangeBounds } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import {
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { addCalendarDaysToDayKey, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Calendar hydrate bounds for the workouts overview shared range (Strength + Cardio main tab).
 * Matches {@link TrainingOverviewScreen} when `anchorDay === todayDayKey`.
 */
export function computeWorkoutOverviewSharedCalendarRange(todayDayKey: DayKey): { start: DayKey; end: DayKey } {
  const weekDaysFull = getWeekDaysForAnchor(todayDayKey);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const recentRangeStart = addCalendarDaysToDayKey(todayDayKey, -120);
  const recentRangeEnd = todayDayKey;
  return overviewSharedRangeBounds({
    weekStart,
    weekEnd,
    recentStart: recentRangeStart,
    recentEnd: recentRangeEnd,
    analyticsStart: WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
    analyticsEnd: WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  });
}
