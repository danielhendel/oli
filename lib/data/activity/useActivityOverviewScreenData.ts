import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import {
  buildActivityDailyDetailsCardModel,
  buildActivityOverviewCardModel,
} from "@/lib/data/activity/activityOverviewCardModel";
import {
  buildActivityRollupAggregateError,
  buildActivitySelectedDayRollupError,
} from "@/lib/data/activity/activityRollupErrorSummary";
import { useActivityStepsRollupMap } from "@/lib/data/activity/useActivityStepsRollupMap";
import type { ActivityDayStripMeta } from "@/lib/data/activity/activityDayStripMeta";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";

export function useActivityOverviewScreenData() {
  const { user, initializing, getIdToken } = useAuth();
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayKeyLocal());
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);

  const todayDayKey = getTodayDayKeyLocal();
  const stepsRollup = useActivityStepsRollupMap(selectedDay, todayDayKey);

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `activityRollup:${Date.now()}` });
      if (Platform.OS === "ios" && user) {
        scheduleAppleHealthStepsRepair({
          trigger: "recovery",
          getIdToken,
        });
      }
    }, [stepsRollup.refetch, user, getIdToken]),
  );

  const weeklyStripDays: CalendarDay<ActivityDayStripMeta>[] = useMemo(() => {
    const todayKey = getTodayDayKeyLocal();
    const map = stepsRollup.status === "ready" ? stepsRollup.rollupByDay : {};
    return weekDayKeys.map((day) => {
      const e = map[day];
      return {
        day,
        meta: {
          hasSteps: day <= todayKey && e?.kind === "numeric" && e.steps > 0,
        },
      };
    });
  }, [weekDayKeys, stepsRollup]);

  const rollupAggregateError = useMemo(() => {
    if (stepsRollup.status !== "ready") return null;
    return buildActivityRollupAggregateError(stepsRollup.rollupByDay, () =>
      void stepsRollup.refetch({ cacheBust: `activityRollupRetry:${Date.now()}` }),
    );
  }, [stepsRollup]);

  const dailyDetailsSelectedError = useMemo(() => {
    if (stepsRollup.status !== "ready") return null;
    return buildActivitySelectedDayRollupError(selectedDay, stepsRollup.rollupByDay, () =>
      void stepsRollup.refetch({ cacheBust: `activityRollupSelectedRetry:${Date.now()}` }),
    );
  }, [selectedDay, stepsRollup]);

  const overviewCardModel = useMemo(() => {
    if (stepsRollup.status !== "ready") return null;
    return buildActivityOverviewCardModel({
      todayDayKey,
      rollupByDay: stepsRollup.rollupByDay,
    });
  }, [stepsRollup, todayDayKey]);

  const dailyDetailsModel = useMemo(() => {
    if (stepsRollup.status !== "ready") return null;
    const entry = stepsRollup.rollupByDay[selectedDay];
    if (entry?.kind === "error") return null;
    return buildActivityDailyDetailsCardModel({
      selectedDay,
      todayDayKey,
      rollupByDay: stepsRollup.rollupByDay,
    });
  }, [stepsRollup, selectedDay, todayDayKey]);

  const overview = useMemo(
    () => ({
      loading: stepsRollup.status === "partial",
      error: rollupAggregateError,
      model: overviewCardModel,
    }),
    [stepsRollup, overviewCardModel, rollupAggregateError],
  );

  const dailyDetails = useMemo(
    () => ({
      loading: stepsRollup.status === "partial",
      error: dailyDetailsSelectedError ?? rollupAggregateError,
      model: dailyDetailsModel,
    }),
    [stepsRollup, dailyDetailsModel, dailyDetailsSelectedError, rollupAggregateError],
  );

  return {
    user,
    initializing,
    selectedDay,
    setSelectedDay,
    weeklyStripDays,
    stepsRollup,
    overview,
    dailyDetails,
  };
}
