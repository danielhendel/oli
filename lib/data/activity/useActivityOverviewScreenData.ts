import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { buildActivityOverviewCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { useActivityStepsRollupMap } from "@/lib/data/activity/useActivityStepsRollupMap";
import type { ActivityDayStripMeta } from "@/lib/data/activity/activityDayStripMeta";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";

export function useActivityOverviewScreenData() {
  const { user, initializing } = useAuth();
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayKeyLocal());
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);

  const stepsRollup = useActivityStepsRollupMap(selectedDay);

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `activityRollup:${Date.now()}` });
    }, [stepsRollup.refetch]),
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

  const overviewCardModel = useMemo(() => {
    if (stepsRollup.status !== "ready") return null;
    return buildActivityOverviewCardModel({
      selectedDay,
      todayDayKey: getTodayDayKeyLocal(),
      rollupByDay: stepsRollup.rollupByDay,
    });
  }, [stepsRollup, selectedDay]);

  const overview = useMemo(
    () => ({
      loading: stepsRollup.status === "partial",
      error: null,
      model: overviewCardModel,
    }),
    [stepsRollup, overviewCardModel],
  );

  return {
    user,
    initializing,
    selectedDay,
    setSelectedDay,
    weeklyStripDays,
    stepsRollup,
    overview,
  };
}
