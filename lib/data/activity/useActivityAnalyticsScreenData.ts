import { useMemo } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildActivityMonthlyStepsAnalyticsModel,
  computeActivityAnalyticsRollupFetchDayKeys,
} from "@/lib/data/activity/activityMonthlyStepsAnalyticsModel";
import { getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import { useActivityStepsRollupForKeys } from "@/lib/data/activity/useActivityStepsRollupMap";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export function useActivityAnalyticsScreenData() {
  const { user, initializing } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const fetchKeys = useMemo(() => computeActivityAnalyticsRollupFetchDayKeys(todayDayKey), [todayDayKey]);

  const rollup = useActivityStepsRollupForKeys(fetchKeys);

  const { hkToday } = useActivityHealthKitTodayStepsCard({
    todayDayKey,
    enabled: Boolean(user) && !initializing,
  });

  const mergedForChart = useMemo(() => {
    const m = { ...rollup.rollupDisplayByDay };
    if (user && hkToday.status === "ready" && typeof hkToday.steps === "number") {
      m[todayDayKey] = { kind: "numeric" as const, steps: hkToday.steps };
    }
    return m;
  }, [rollup.rollupDisplayByDay, hkToday, todayDayKey, user]);

  const overviewAnchorEndDay = useMemo(() => getActivityOverviewAnchorEndDay(todayDayKey), [todayDayKey]);

  const model = useMemo(
    () =>
      buildActivityMonthlyStepsAnalyticsModel({
        rollupByDay: mergedForChart,
        todayDayKey,
        baselineRollupByDay: rollup.rollupDisplayByDay,
        overviewAnchorEndDay,
      }),
    [mergedForChart, todayDayKey, rollup.rollupDisplayByDay, overviewAnchorEndDay],
  );

  return {
    user,
    initializing,
    rollupStatus: rollup.status,
    model,
  };
}
