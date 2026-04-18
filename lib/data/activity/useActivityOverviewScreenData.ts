import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import {
  buildActivityDailyDetailsCardModel,
  buildActivityOverviewCardModel,
  buildActivityTodayStepsLiveCardModel,
} from "@/lib/data/activity/activityOverviewCardModel";
import {
  buildActivityRollupAggregateError,
  buildActivitySelectedDayRollupError,
} from "@/lib/data/activity/activityRollupErrorSummary";
import { getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import { useActivityStepsRollupMap } from "@/lib/data/activity/useActivityStepsRollupMap";
import type { ActivityDayStripMeta } from "@/lib/data/activity/activityDayStripMeta";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { getStepRatingTierIndex } from "@/lib/utils/activityStepRating";

export function useActivityOverviewScreenData() {
  const { user, initializing, getIdToken } = useAuth();
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayKeyLocal());
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);

  const todayDayKey = getTodayDayKeyLocal();
  const overviewAnchorEndDay = useMemo(() => getActivityOverviewAnchorEndDay(todayDayKey), [todayDayKey]);
  const stepsRollup = useActivityStepsRollupMap(selectedDay);
  const displayRollup = stepsRollup.rollupDisplayByDay;

  const { hkToday, refreshHealthKitToday } = useActivityHealthKitTodayStepsCard({
    todayDayKey,
    enabled: Boolean(user) && !initializing,
  });

  const scheduleActivityStepsRepair = useCallback(() => {
    if (Platform.OS !== "ios" || !user || initializing) return;
    scheduleAppleHealthStepsRepair({
      trigger: "recovery",
      getIdToken,
    });
  }, [getIdToken, initializing, user]);

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `activityRollup:${Date.now()}` });
      scheduleActivityStepsRepair();
    }, [scheduleActivityStepsRepair, stepsRollup.refetch]),
  );

  const weeklyStripDays: CalendarDay<ActivityDayStripMeta>[] = useMemo(() => {
    const todayKey = getTodayDayKeyLocal();
    const map = displayRollup;
    return weekDayKeys.map((day) => {
      const e = map[day];
      const ringTierIndex =
        day <= todayKey && e?.kind === "numeric" && e.steps > 0
          ? getStepRatingTierIndex(Math.round(e.steps))
          : null;
      return {
        day,
        meta: {
          hasSteps: day <= todayKey && e?.kind === "numeric" && e.steps > 0,
          ringTierIndex,
        },
      };
    });
  }, [weekDayKeys, displayRollup]);

  const rollupAggregateError = useMemo(() => {
    return buildActivityRollupAggregateError(displayRollup, () =>
      void stepsRollup.refetch({ cacheBust: `activityRollupRetry:${Date.now()}` }),
    );
  }, [displayRollup, stepsRollup]);

  const rollupTodayEntryError = useMemo(() => {
    return buildActivitySelectedDayRollupError(todayDayKey, displayRollup, () =>
      void stepsRollup.refetch({ cacheBust: `activityRollupTodayRetry:${Date.now()}` }),
    );
  }, [todayDayKey, displayRollup, stepsRollup]);

  const overviewCardModel = useMemo(() => {
    return buildActivityOverviewCardModel({
      overviewAnchorEndDay,
      rollupByDay: displayRollup,
    });
  }, [displayRollup, overviewAnchorEndDay]);

  const todayRollupEntry = displayRollup[todayDayKey];
  const hasRollupForTodayCard =
    todayRollupEntry != null && todayRollupEntry.kind !== "error";

  const dailyDetailsModel = useMemo(() => {
    const entry = displayRollup[todayDayKey];

    if (user && hkToday.status === "ready") {
      return buildActivityTodayStepsLiveCardModel({ todayDayKey, steps: hkToday.steps });
    }

    if (user && hkToday.status === "partial") {
      if (entry?.kind === "error") return null;
      if (entry?.kind === "numeric" || entry?.kind === "absent") {
        return buildActivityDailyDetailsCardModel({
          detailDayKey: todayDayKey,
          todayDayKey,
          rollupByDay: displayRollup,
        });
      }
      return null;
    }

    if (user && hkToday.status === "failed") {
      if (entry?.kind === "error") return null;
      if (entry?.kind === "numeric" || entry?.kind === "absent") {
        return buildActivityDailyDetailsCardModel({
          detailDayKey: todayDayKey,
          todayDayKey,
          rollupByDay: displayRollup,
        });
      }
      return null;
    }

    if (user && hkToday.status === "skipped") {
      if (entry?.kind === "error") return null;
      if (entry?.kind === "numeric" || entry?.kind === "absent") {
        return buildActivityDailyDetailsCardModel({
          detailDayKey: todayDayKey,
          todayDayKey,
          rollupByDay: displayRollup,
        });
      }
      return null;
    }

    return null;
  }, [hkToday, displayRollup, todayDayKey, user]);

  const dailyDetailsTodayError = useMemo(() => {
    if (user && hkToday.status === "ready") {
      return null;
    }
    if (user && hkToday.status === "failed" && hasRollupForTodayCard) {
      const e = displayRollup[todayDayKey];
      if (e?.kind === "numeric" || e?.kind === "absent") return null;
      if (e?.kind === "error") return rollupTodayEntryError;
      return {
        message: hkToday.error,
        requestId: null as string | null,
        onRetry: () => {
          refreshHealthKitToday();
          void stepsRollup.refetch({ cacheBust: `activityRollupTodayHkRetry:${Date.now()}` });
        },
      };
    }
    return rollupTodayEntryError;
  }, [hkToday, refreshHealthKitToday, hasRollupForTodayCard, rollupTodayEntryError, displayRollup, todayDayKey, user]);

  const dailyDetailsLoading = useMemo(() => {
    if (!user) return false;
    if (hkToday.status === "partial") {
      return !hasRollupForTodayCard;
    }
    if (hkToday.status === "failed") {
      return displayRollup[todayDayKey] === undefined;
    }
    if (hkToday.status === "ready") return false;
    return stepsRollup.status === "partial";
  }, [hkToday.status, hasRollupForTodayCard, displayRollup, stepsRollup.status, user]);

  const overview = useMemo(
    () => ({
      loading: false,
      error: rollupAggregateError,
      model: overviewCardModel,
    }),
    [overviewCardModel, rollupAggregateError],
  );

  const dailyDetails = useMemo(
    () => ({
      loading: dailyDetailsLoading,
      error: dailyDetailsTodayError,
      model: dailyDetailsModel,
    }),
    [dailyDetailsLoading, dailyDetailsModel, dailyDetailsTodayError],
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
