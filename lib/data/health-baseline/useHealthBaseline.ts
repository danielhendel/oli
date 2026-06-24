// lib/data/health-baseline/useHealthBaseline.ts
/**
 * Composition hook: wires existing read-only data hooks into the pure Health Baseline builder.
 * No Firebase in UI — all network I/O stays in existing data hooks.
 */
import { useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { buildActivityHistorySummaryModel } from "@/lib/data/activity/activityHistorySummaryModel";
import { useActivityStepsRollupMap } from "@/lib/data/activity/ActivityRollupProvider";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { buildHealthBaseline } from "@/lib/data/health-baseline/buildHealthBaseline";
import { buildHealthBaselineSummary } from "@/lib/data/health-baseline/buildHealthBaselineSummary";
import type { HealthBaselineInput } from "@/lib/data/health-baseline/healthBaselineInput";
import type { HealthBaseline, HealthBaselineSummary } from "@/lib/data/health-baseline/types";
import { useCurrentStateProfile } from "@/lib/data/health-assessment/healthAssessmentStore";
import { useLabsSummary } from "@/lib/data/labs/useLabsSummary";
import { buildNutritionBaselineModel } from "@/lib/data/nutrition/nutritionBaselineModel";
import {
  aggregateNutritionTotalsForDays,
} from "@/lib/data/nutrition/nutritionFactsAggregate";
import { nutritionOverviewFactsDayKeys } from "@/lib/data/nutrition/nutritionOverviewDayKeys";
import { trailing90ThroughYesterday } from "@/lib/data/nutrition/nutritionOverviewDayKeys";
import { useNutritionDailyFactsRollup } from "@/lib/data/nutrition/useNutritionDailyFactsRollup";
import { buildSleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import { computeSleepBaselineFetchDayKeys } from "@/lib/data/sleep/sleepOverviewRanges";
import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useEvents } from "@/lib/data/useEvents";
import { buildCardioBaselineCardModel } from "@/lib/data/workouts/cardioBaselineCardModel";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import { useStrengthBaseline } from "@/lib/hooks/useStrengthBaseline";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type HealthBaselineLoadState = "loading" | "ready" | "error" | "signed-out";

export type UseHealthBaselineResult = {
  state: HealthBaselineLoadState;
  baseline: HealthBaseline | null;
  summary: HealthBaselineSummary | null;
  errorMessage: string | null;
  refetch: () => void;
};

export function useHealthBaseline(): UseHealthBaselineResult {
  const { user, initializing } = useAuth();
  const isFocused = useIsFocused();
  const enabled = isFocused;
  const todayDayKey = useMemo(() => getTodayDayKeyLocal(), []);
  const currentStateProfile = useCurrentStateProfile();

  const bodyData = useBodyOverviewData();
  const strengthBaseline = useStrengthBaseline();
  const stepsRollup = useActivityStepsRollupMap(todayDayKey, { registerStripAnchor: false });
  const dailyFacts = useDailyFacts(todayDayKey, { enabled });
  const labs = useLabsSummary({ enabled });

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => computeWorkoutOverviewSharedCalendarRange(todayDayKey),
    [todayDayKey],
  );
  const calendarRange = useWorkoutsCalendarRange(rangeStart, rangeEnd, {
    rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
    debugHydrateLabel: "health-baseline",
  });

  const nutritionDayKeys = useMemo(
    () => nutritionOverviewFactsDayKeys({ todayDayKey, weekAnchorDay: todayDayKey }),
    [todayDayKey],
  );
  const nutritionRollup = useNutritionDailyFactsRollup(nutritionDayKeys);
  const nutritionEvents = useEvents(
    useMemo(() => {
      const start = nutritionDayKeys[0] ?? todayDayKey;
      const end = todayDayKey;
      return { start, end, limit: 500, kinds: ["nutrition"] as const };
    }, [nutritionDayKeys, todayDayKey]),
    { enabled },
  );

  const sleepDayKeys = useMemo(
    () => computeSleepBaselineFetchDayKeys(todayDayKey),
    [todayDayKey],
  );
  const sleepRollup = useSleepNightRollupMap(sleepDayKeys);

  const signedOut = !initializing && user == null;

  const loading =
    !signedOut &&
    !initializing &&
    (bodyData.series.status === "partial" ||
      strengthBaseline.loading ||
      stepsRollup.status === "partial" ||
      calendarRange.status === "partial" ||
      nutritionRollup.status === "partial" ||
      sleepRollup.status === "partial" ||
      dailyFacts.status === "partial" ||
      labs.status === "partial" ||
      nutritionEvents.status === "partial");

  const errorMessage = useMemo((): string | null => {
    if (signedOut || loading) return null;
    if (labs.status === "error") return labs.error;
    if (nutritionRollup.status === "error") return nutritionRollup.error;
    if (calendarRange.status === "error") return calendarRange.error;
    return null;
  }, [signedOut, loading, labs, nutritionRollup, calendarRange, stepsRollup.status]);

  const baselineInput = useMemo((): HealthBaselineInput | null => {
    if (signedOut || loading) return null;

    const weightBaselineModel =
      bodyData.weightBaseline.status === "ready" ? bodyData.weightBaseline.model : null;

    const activityHistoryModel =
      stepsRollup.status === "ready"
        ? buildActivityHistorySummaryModel({
            todayDayKey,
            rollupByDay: stepsRollup.rollupDisplayByDay,
          })
        : null;

    const cardioDays =
      calendarRange.status === "ready"
        ? mapWorkoutCalendarDaysForDomain(calendarRange.days, "cardio")
        : [];
    const cardioBaselineModel =
      calendarRange.status === "ready"
        ? buildCardioBaselineCardModel({ cardioCalendarDays: cardioDays, todayDayKey })
        : null;

    const nutritionEventsList =
      nutritionEvents.status === "ready" ? nutritionEvents.data.items : [];

    const nutritionBaselineModel =
      nutritionRollup.status === "ready"
        ? buildNutritionBaselineModel({
            todayDayKey,
            byDay: nutritionRollup.byDay,
            nutritionEvents: nutritionEventsList,
          })
        : null;

    const day90 = trailing90ThroughYesterday(todayDayKey);
    const macroDays = enumerateDaysInclusive(day90.rangeStart, day90.rangeEnd);
    const macroTotals90d =
      nutritionRollup.status === "ready"
        ? aggregateNutritionTotalsForDays(nutritionRollup.byDay, macroDays)
        : null;

    const sleepBaselineVm =
      sleepRollup.status === "ready"
        ? buildSleepBaselineVm({ todayDayKey, sleepNightByDay: sleepRollup.sleepNightByDay })
        : null;

    const facts = dailyFacts.status === "ready" ? dailyFacts.data : null;
    const activeMinutesToday = facts?.activity?.moveMinutes ?? null;
    const cardioPace = facts?.cardio?.paceMinPerKm ?? null;
    const recoveryHrv = facts?.recovery?.hrvRmssd ?? null;
    const recoveryRhr = facts?.recovery?.restingHeartRate ?? facts?.cardio?.averageHeartRateBpm ?? null;

    return {
      todayDayKey,
      body: {
        weightKg: bodyData.overview.weightKg,
        bodyFatPercent: bodyData.overview.bodyFatPercent,
        leanMassKg: bodyData.overview.leanBodyMassKg,
        bmi: bodyData.overview.bmi,
        weightBaselineModel,
      },
      activity: {
        historyModel: activityHistoryModel,
        activeMinutesToday: activeMinutesToday ?? null,
      },
      strength: {
        baselineModel: strengthBaseline.model,
      },
      cardio: {
        baselineModel: cardioBaselineModel,
        restingHeartRateBpm: recoveryRhr ?? null,
        paceMinPerKm: cardioPace ?? null,
      },
      nutrition: {
        baselineModel: nutritionBaselineModel,
        macroTotals90d: macroTotals90d?.hasData ? macroTotals90d : null,
      },
      recovery: {
        sleepBaselineVm,
        hrvRmssd: recoveryHrv ?? null,
        restingHeartRateBpm: recoveryRhr ?? null,
      },
      labs: {
        summary: labs.status === "ready" ? labs.data : null,
      },
    };
  }, [
    signedOut,
    loading,
    bodyData,
    stepsRollup,
    todayDayKey,
    calendarRange,
    nutritionRollup,
    nutritionEvents,
    sleepRollup,
    dailyFacts,
    strengthBaseline.model,
    labs,
  ]);

  const baseline = useMemo(
    () => (baselineInput != null ? buildHealthBaseline(baselineInput) : null),
    [baselineInput],
  );

  const summary = useMemo(
    () =>
      baseline != null
        ? buildHealthBaselineSummary({ baseline, currentStateProfile })
        : null,
    [baseline, currentStateProfile],
  );

  const state: HealthBaselineLoadState = signedOut
    ? "signed-out"
    : loading
      ? "loading"
      : errorMessage != null
        ? "error"
        : "ready";

  const refetch = () => {
    void bodyData.series.refetch({ cacheBust: `healthBaseline:${Date.now()}` });
    void stepsRollup.refetch({ cacheBust: `healthBaseline:${Date.now()}` });
    void dailyFacts.refetch({ cacheBust: `healthBaseline:${Date.now()}` });
    labs.refetch();
    nutritionRollup.refetch({ cacheBust: `healthBaseline:${Date.now()}` });
    nutritionEvents.refetch();
    sleepRollup.refetch({ cacheBust: `healthBaseline:${Date.now()}` });
  };

  return {
    state,
    baseline,
    summary,
    errorMessage,
    refetch,
  };
}
