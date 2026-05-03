/**
 * Calendar hydrate for Cardio Analytics — same overview slice as Strength analytics-detail,
 * domain-filtered to cardio.
 */

import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import {
  filterWorkoutCalendarDaysInclusive,
  overviewSharedRangeBounds,
} from "@/lib/data/workouts/overviewCalendarRangeSlices";
import {
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
  WORKOUT_OVERVIEW_ANALYTICS_YEAR,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { buildCardioMonthlyMilesAnalyticsModel } from "@/lib/data/workouts/cardioMonthlyMilesAnalyticsModel";
import type { CardioMonthlyMilesAnalyticsModel } from "@/lib/data/workouts/cardioMonthlyMilesAnalyticsModel";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";

export type CardioAnalyticsDetailScreenData = {
  model: CardioMonthlyMilesAnalyticsModel | null;
  calendarReady: boolean;
};

export function useCardioAnalyticsDetailScreenData(
  uid: string | undefined,
): CardioAnalyticsDetailScreenData {
  const today = getTodayDayKeyLocal();
  const weekDaysFull = getWeekDaysForAnchor(today);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const recentRangeStart = addCalendarDaysToDayKey(today, -120);
  const recentRangeEnd = today;

  const [refreshEpoch, setRefreshEpoch] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRefreshEpoch((n) => n + 1);
    }, []),
  );

  const { start: overviewRangeStart, end: overviewRangeEnd } = useMemo(
    () =>
      overviewSharedRangeBounds({
        weekStart,
        weekEnd,
        recentStart: recentRangeStart,
        recentEnd: recentRangeEnd,
        analyticsStart: WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
        analyticsEnd: WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
      }),
    [weekStart, weekEnd, recentRangeStart, recentRangeEnd],
  );

  const calendarRangeOptions = useMemo(
    () => ({
      refreshEpoch,
      rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
      debugHydrateLabel: "cardio-analytics-detail" as const,
    }),
    [refreshEpoch],
  );

  const overviewSharedRange = useWorkoutsCalendarRange(
    overviewRangeStart,
    overviewRangeEnd,
    calendarRangeOptions,
  );

  const sharedDays = overviewSharedRange.status === "ready" ? overviewSharedRange.days : [];

  const domainSharedDays = useMemo(() => mapWorkoutCalendarDaysForDomain(sharedDays, "cardio"), [sharedDays]);

  const analyticsDaysSlice = useMemo(
    () =>
      filterWorkoutCalendarDaysInclusive(
        domainSharedDays,
        WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
        WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
      ),
    [domainSharedDays],
  );

  const model = useMemo(() => {
    if (!uid || overviewSharedRange.status !== "ready") return null;
    return buildCardioMonthlyMilesAnalyticsModel({
      cardioCalendarDays: analyticsDaysSlice,
      analyticsYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
      todayDayKey: today,
    });
  }, [uid, overviewSharedRange.status, analyticsDaysSlice, today]);

  return {
    model,
    calendarReady: overviewSharedRange.status === "ready",
  };
}
