import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import { resolveActivityBaselineCardState } from "@/lib/data/activity/activityBaselineCardState";
import { buildActivityHistorySummaryModel } from "@/lib/data/activity/activityHistorySummaryModel";
import {
  buildActivityDailyDetailsCardModel,
  buildActivityTodayStepsLiveCardModel,
  parseActivityDailyDetailsNumericSteps,
} from "@/lib/data/activity/activityOverviewCardModel";
import { buildActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import { buildActivityTodayOverviewCardModel } from "@/lib/data/activity/activityTodayOverviewCardModel";
import { mergeTodayDetailsWithBaselineDelta } from "@/lib/data/activity/activityTodayBaselineDelta";
import {
  buildActivityRollupAggregateError,
  buildActivitySelectedDayRollupError,
} from "@/lib/data/activity/activityRollupErrorSummary";
import { getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import { useActivityStepsRollupMap } from "@/lib/data/activity/ActivityRollupProvider";
import { useActivityTodayStepsAllocation } from "@/lib/data/activity/useActivityTodayStepsAllocation";
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

  /**
   * Phase 2B — DailyFacts allocation authority. When backend has produced
   * `activity.stepsAllocation` for today, DailyFacts becomes the single authority for the
   * Today headline (HK live override is bypassed) and the allocation buckets drive the
   * NEAT/Strength/Cardio rows on the card.
   */
  const todayAllocation = useActivityTodayStepsAllocation(todayDayKey, {
    enabled: Boolean(user) && !initializing,
  });
  const dailyFactsIsAuthorityForToday =
    todayAllocation.status === "ready" && todayAllocation.allocation != null;

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

  /** Merge live HealthKit today into rollup view so baseline windows match the Today card when HK is authoritative. */
  const rollupMergedForBaselineWindows = useMemo(() => {
    const m = { ...displayRollup };
    if (user && hkToday.status === "ready" && typeof hkToday.steps === "number") {
      m[todayDayKey] = { kind: "numeric" as const, steps: hkToday.steps };
    }
    return m;
  }, [displayRollup, hkToday, todayDayKey, user]);

  const baselineDetails = useMemo(() => {
    const { loading, model } = resolveActivityBaselineCardState({
      user,
      stepsRollupStatus: stepsRollup.status,
      overviewAnchorEndDay,
      rollupDisplayByDay: displayRollup,
    });
    return {
      loading,
      error: null,
      model,
    };
  }, [user, stepsRollup.status, overviewAnchorEndDay, displayRollup]);

  const activityBaselineMeanSteps = useMemo(() => {
    const m = baselineDetails.model;
    if (m == null) return null;
    return parseActivityDailyDetailsNumericSteps(m.compactStatsSummary);
  }, [baselineDetails.model]);

  const activityHistorySummaryModel = useMemo(() => {
    return buildActivityHistorySummaryModel({
      todayDayKey,
      rollupByDay: rollupMergedForBaselineWindows,
    });
  }, [rollupMergedForBaselineWindows, todayDayKey]);

  const activityThisWeekCardModel = useMemo(() => {
    return buildActivityThisWeekCardModel({
      todayDayKey,
      weekDayKeys: getWeekDaysForAnchor(todayDayKey),
      rollupByDay: rollupMergedForBaselineWindows,
      baselineMeanSteps: activityBaselineMeanSteps,
    });
  }, [rollupMergedForBaselineWindows, todayDayKey, activityBaselineMeanSteps]);

  const todayRollupEntry = displayRollup[todayDayKey];
  const hasRollupForTodayCard =
    todayRollupEntry != null && todayRollupEntry.kind !== "error";

  const dailyDetailsModel = useMemo(() => {
    const entry = displayRollup[todayDayKey];

    /**
     * Phase 2B — When `activity.stepsAllocation` exists, DailyFacts is the single authority
     * for the Today headline. Skip the HK live override entirely; rely on the rollup, which
     * already mirrors `DailyFacts.activity.steps`.
     */
    if (user && dailyFactsIsAuthorityForToday) {
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
  }, [hkToday, displayRollup, todayDayKey, user, dailyFactsIsAuthorityForToday]);

  const dailyDetailsTodayError = useMemo(() => {
    /**
     * Phase 2B — When DailyFacts is the authority, HK live error/retry surfaces are
     * suppressed for the Today headline. Only rollup errors are surfaced.
     */
    if (user && dailyFactsIsAuthorityForToday) {
      return rollupTodayEntryError;
    }
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
  }, [hkToday, refreshHealthKitToday, hasRollupForTodayCard, rollupTodayEntryError, displayRollup, todayDayKey, user, dailyFactsIsAuthorityForToday]);

  const dailyDetailsLoading = useMemo(() => {
    if (!user) return false;
    /**
     * Phase 2B — When DailyFacts is the authority, the loading signal is purely about
     * whether the rollup entry for today is available (HK statuses are ignored).
     */
    if (dailyFactsIsAuthorityForToday) {
      return !hasRollupForTodayCard && stepsRollup.status === "partial";
    }
    if (hkToday.status === "partial") {
      return !hasRollupForTodayCard;
    }
    if (hkToday.status === "failed") {
      return displayRollup[todayDayKey] === undefined;
    }
    if (hkToday.status === "ready") return false;
    return stepsRollup.status === "partial";
  }, [hkToday.status, hasRollupForTodayCard, displayRollup, stepsRollup.status, user, dailyFactsIsAuthorityForToday, todayDayKey]);

  const dailyDetailsModelMerged = useMemo(
    () => mergeTodayDetailsWithBaselineDelta(dailyDetailsModel, baselineDetails.model),
    [dailyDetailsModel, baselineDetails.model],
  );

  const dailyDetails = useMemo(
    () => ({
      loading: dailyDetailsLoading,
      error: dailyDetailsTodayError,
      model: dailyDetailsModelMerged,
    }),
    [dailyDetailsLoading, dailyDetailsModelMerged, dailyDetailsTodayError],
  );

  /**
   * Phase 2B — only forward the DailyFacts allocation when it is the authority for today.
   * Belt-and-braces with the builder's partition guard: without authority the rows must
   * not render, period.
   */
  const allocationForTodayCard = useMemo(() => {
    if (!dailyFactsIsAuthorityForToday) return undefined;
    if (todayAllocation.status !== "ready") return undefined;
    return todayAllocation.allocation;
  }, [dailyFactsIsAuthorityForToday, todayAllocation]);

  const activityTodayCardModel = useMemo(
    () => buildActivityTodayOverviewCardModel(dailyDetails.model, allocationForTodayCard),
    [dailyDetails.model, allocationForTodayCard],
  );

  return {
    user,
    initializing,
    selectedDay,
    setSelectedDay,
    weeklyStripDays,
    stepsRollup,
    rollupAggregateError,
    activityHistorySummaryModel,
    activityThisWeekCardModel,
    activityTodayCardModel,
    dailyDetails,
    baselineDetails,
  };
}
