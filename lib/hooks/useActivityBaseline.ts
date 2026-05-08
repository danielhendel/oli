import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { resolveActivityBaselineCardState } from "@/lib/data/activity/activityBaselineCardState";
import {
  buildActivityRollupAggregateError,
  type ActivityRollupInlineError,
} from "@/lib/data/activity/activityRollupErrorSummary";
import { getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import { useActivityStepsRollupMap } from "@/lib/data/activity/ActivityRollupProvider";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export type UseActivityBaselineResult = {
  user: ReturnType<typeof useAuth>["user"];
  initializing: boolean;
  loading: boolean;
  /** When baseline is insufficient and some daily-facts fetches failed — retry may help. */
  error: ActivityRollupInlineError | null;
  model: ReturnType<typeof resolveActivityBaselineCardState>["model"];
};

/**
 * Activity Baseline (90-day mean steps) for Dash: same rollup + model semantics as Activity overview,
 * without Today’s Steps / HealthKit coupling.
 */
export function useActivityBaseline(): UseActivityBaselineResult {
  const { user, initializing, getIdToken } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const stepsRollup = useActivityStepsRollupMap(todayDayKey, { registerStripAnchor: false });
  const displayRollup = stepsRollup.rollupDisplayByDay;

  const overviewAnchorEndDay = useMemo(() => getActivityOverviewAnchorEndDay(todayDayKey), [todayDayKey]);

  const scheduleActivityStepsRepair = useCallback(() => {
    if (Platform.OS !== "ios" || !user || initializing) return;
    scheduleAppleHealthStepsRepair({
      trigger: "recovery",
      getIdToken,
      userUid: user.uid,
    });
  }, [getIdToken, initializing, user]);

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `dashActivityBaseline:${Date.now()}` });
      scheduleActivityStepsRepair();
    }, [scheduleActivityStepsRepair, stepsRollup.refetch]),
  );

  const { loading, model } = useMemo(
    () =>
      resolveActivityBaselineCardState({
        user,
        stepsRollupStatus: stepsRollup.status,
        overviewAnchorEndDay,
        rollupDisplayByDay: displayRollup,
      }),
    [user, stepsRollup.status, overviewAnchorEndDay, displayRollup],
  );

  const rollupAggregateError = useMemo(() => {
    return buildActivityRollupAggregateError(displayRollup, () =>
      void stepsRollup.refetch({ cacheBust: `dashActivityBaselineRetry:${Date.now()}` }),
    );
  }, [displayRollup, stepsRollup.refetch]);

  const error = useMemo(() => {
    if (loading || initializing) return null;
    if (model?.compactStatsSummary !== ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA) return null;
    return rollupAggregateError;
  }, [rollupAggregateError, loading, initializing, model?.compactStatsSummary]);

  return {
    user,
    initializing,
    loading: initializing || loading,
    error,
    model,
  };
}
