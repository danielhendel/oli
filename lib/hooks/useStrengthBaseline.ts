import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import {
  buildStrengthBaselineCardModel,
  type StrengthBaselineCardModel,
} from "@/lib/data/workouts/strengthBaselineCardModel";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export type UseStrengthBaselineResult = {
  user: ReturnType<typeof useAuth>["user"];
  initializing: boolean;
  loading: boolean;
  error: ActivityRollupInlineError | null;
  model: StrengthBaselineCardModel | null;
};

/**
 * Strength Baseline (90-day avg sessions/wk) for Dash — same calendar hydrate + {@link buildStrengthBaselineCardModel}
 * as the Strength overview tab.
 */
export function useStrengthBaseline(): UseStrengthBaselineResult {
  const { user, initializing } = useAuth();
  const [refreshEpoch, setRefreshEpoch] = useState(0);
  const todayDayKey = getTodayDayKeyLocal();

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => computeWorkoutOverviewSharedCalendarRange(todayDayKey),
    [todayDayKey],
  );

  const calendarOptions = useMemo(
    () => ({
      refreshEpoch,
      rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
      debugHydrateLabel: "dash-strength-baseline" as const,
    }),
    [refreshEpoch],
  );

  const overviewSharedRange = useWorkoutsCalendarRange(rangeStart, rangeEnd, calendarOptions);

  const bumpRefresh = useCallback(() => {
    setRefreshEpoch((n) => n + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      bumpRefresh();
    }, [bumpRefresh]),
  );

  const model = useMemo(() => {
    if (!user || initializing) return null;
    if (overviewSharedRange.status !== "ready") return null;
    const strengthDays = mapWorkoutCalendarDaysForDomain(overviewSharedRange.days, "strength");
    return buildStrengthBaselineCardModel({
      strengthCalendarDays: strengthDays,
      todayDayKey,
    });
  }, [user, initializing, overviewSharedRange, todayDayKey]);

  const loading = Boolean(user) && !initializing && overviewSharedRange.status === "partial";

  const error = useMemo((): ActivityRollupInlineError | null => {
    if (!user || initializing || loading) return null;
    if (overviewSharedRange.status !== "error") return null;
    return {
      message: overviewSharedRange.error,
      requestId: overviewSharedRange.requestId,
      onRetry: bumpRefresh,
    };
  }, [user, initializing, loading, overviewSharedRange, bumpRefresh]);

  return {
    user,
    initializing,
    loading: initializing || loading,
    error,
    model,
  };
}
