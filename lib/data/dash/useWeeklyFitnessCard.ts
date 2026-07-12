/**
 * Dash Weekly Fitness card data source — assembles one {@link WeeklyFitnessCardModel}.
 *
 * Request budget (elapsed week ≤7 days):
 * - prefs (shared)
 * - activity steps rollup (shell keys; no year)
 * - ≤7 daily-facts (week)
 * - 1 sleep-nights range
 * - 1 oura-readiness-range
 * - 1 oura-stress range
 * - body overview (shared; for Body Composition Score)
 *
 * No sleep-day-refresh, pull-now, or year workout hydrate.
 */
import { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useActivityStepsRollupMap } from "@/lib/data/activity/ActivityRollupProvider";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  buildWeeklyFitnessCardModel,
  type WeeklyFitnessCardModel,
} from "@/lib/data/dash/buildWeeklyFitnessCardModel";
import {
  computeWeeklyFitnessActivityMetrics,
  computeWeeklyFitnessCardioMetricsFromFacts,
  computeWeeklyFitnessSleepMetrics,
  computeWeeklyFitnessStrengthMetricsFromFacts,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import { computeWeeklyNutritionLoggingCoverage } from "@/lib/data/dash/weeklyNutritionCoverage";
import {
  computeWeeklyStressBalancedCoverage,
  type WeeklyStressDayInput,
} from "@/lib/data/dash/ouraStressWeekly";
import { computeWeeklyReadinessAverage } from "@/lib/data/dash/ouraReadinessWeekly";
import { useWeeklyFitnessDailyFactsRollup } from "@/lib/data/dash/useWeeklyFitnessDailyFactsRollup";
import { useWeeklyFitnessSleepRollupMap } from "@/lib/data/dash/useWeeklyFitnessSleepRollupMap";
import { useOuraStressRange } from "@/lib/data/dash/useOuraStressRange";
import { useOuraReadinessRange } from "@/lib/data/dash/useOuraReadinessRange";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { deriveOuraImportState } from "@/lib/integrations/oura/importState";
import { networkDayKeysThroughToday } from "@/lib/dates/boundDayKeys";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { resolveWeeklyFitnessGoals } from "@/lib/preferences/weeklyFitnessGoals";
import {
  WEEKLY_FITNESS_ROUTES,
} from "@/lib/data/dash/weeklyFitnessRoutes";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  canonicalUnitForBodyCompositionMetric,
  type BodyCompositionPrimaryMetric,
} from "@oli/contracts";
import type { OuraDailyStressSummary } from "@oli/contracts";

export type { WeeklyFitnessRowKey } from "@/lib/data/dash/weeklyFitnessRoutes";
export { WEEKLY_FITNESS_ROUTES, weeklyFitnessMetricPageHref } from "@/lib/data/dash/weeklyFitnessRoutes";
export type { WeeklyFitnessMetricRowModel as WeeklyFitnessRow } from "@/lib/data/dash/buildWeeklyFitnessCardModel";

export type UseWeeklyFitnessCardResult = {
  loading: boolean;
  error: string | null;
  model: WeeklyFitnessCardModel | null;
  /** Always present; resolves to defaults when no goals are persisted. */
  goals: ReturnType<typeof resolveWeeklyFitnessGoals>;
  goalsHref: string;
  baselineSource: {
    todayDayKey: DayKey;
    rollupByDay: Readonly<ActivityStepsRollupMap>;
    availableRangeStart: DayKey;
    availableRangeEnd: DayKey;
  };
};

function resolveOuraConnection(
  presence: ReturnType<typeof useOuraPresence>,
): "connected" | "disconnected" | "reconnect_required" | "unknown" {
  if (presence.status === "partial") return "unknown";
  if (presence.status === "error") return "unknown";
  if (!presence.data.connected) return "disconnected";
  const importState = deriveOuraImportState({
    connected: presence.data.connected,
    lastSnapshotAt: presence.data.lastSnapshotAt,
    backfillStatus: presence.data.backfillStatus,
  });
  if (importState === "failed") return "reconnect_required";
  return "connected";
}

export function useWeeklyFitnessCard(): UseWeeklyFitnessCardResult {
  const { user, initializing } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const enabled = Boolean(user) && !initializing;

  const { state: prefState } = usePreferences();
  const weeklyGoalsStamp = prefState.preferences.weeklyFitnessGoals?.updatedAt;
  const goals = useMemo(
    () => resolveWeeklyFitnessGoals(prefState.preferences),
    [prefState.preferences, weeklyGoalsStamp],
  );
  const bodyGoal = prefState.preferences.bodyCompositionGoal ?? null;

  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(todayDayKey), [todayDayKey]);
  const weekNetworkDayKeys = useMemo(
    () => networkDayKeysThroughToday(weekDayKeys, todayDayKey),
    [weekDayKeys, todayDayKey],
  );

  const weekStartDay = weekDayKeys[0]!;
  const weekEndDay = weekDayKeys[weekDayKeys.length - 1]!;
  const networkStart = weekNetworkDayKeys[0] ?? null;
  const networkEnd =
    weekNetworkDayKeys.length > 0
      ? weekNetworkDayKeys[weekNetworkDayKeys.length - 1]!
      : null;

  const stepsRollup = useActivityStepsRollupMap(todayDayKey, { registerStripAnchor: false });
  const displayRollup = stepsRollup.rollupDisplayByDay;

  const { hkToday } = useActivityHealthKitTodayStepsCard({
    todayDayKey,
    enabled,
  });

  const rollupMergedForWeek = useMemo(() => {
    const m = { ...displayRollup };
    if (user && hkToday.status === "ready" && typeof hkToday.steps === "number") {
      m[todayDayKey] = { kind: "numeric" as const, steps: hkToday.steps };
    }
    return m;
  }, [displayRollup, hkToday, todayDayKey, user]);

  const dailyFactsWeeklyRollup = useWeeklyFitnessDailyFactsRollup(weekNetworkDayKeys);
  const sleepRollup = useWeeklyFitnessSleepRollupMap(weekNetworkDayKeys);
  const readinessRange = useOuraReadinessRange(networkStart, networkEnd, { enabled });
  const stressRange = useOuraStressRange(networkStart, networkEnd, { enabled });
  const ouraPresence = useOuraPresence();
  const body = useBodyOverviewData();

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `weeklyFitnessSteps:${Date.now()}` });
      sleepRollup.refetch({ cacheBust: `weeklyFitnessSleep:${Date.now()}` });
      dailyFactsWeeklyRollup.refetch({ cacheBust: `weeklyFitnessDailyFacts:${Date.now()}` });
      readinessRange.refetch({ cacheBust: `weeklyFitnessReadiness:${Date.now()}` });
      stressRange.refetch({ cacheBust: `weeklyFitnessStress:${Date.now()}` });
    }, [
      dailyFactsWeeklyRollup.refetch,
      sleepRollup.refetch,
      stepsRollup.refetch,
      readinessRange.refetch,
      stressRange.refetch,
    ]),
  );

  const ouraConnection = resolveOuraConnection(ouraPresence);

  const model = useMemo((): WeeklyFitnessCardModel | null => {
    if (!user || initializing) return null;

    const activity = computeWeeklyFitnessActivityMetrics({
      weekDayKeys,
      todayDayKey,
      rollupByDay: rollupMergedForWeek,
      goalStepsPerDay: goals.activityStepsPerDayGoal,
    });

    const strength = computeWeeklyFitnessStrengthMetricsFromFacts({
      factsByDay: dailyFactsWeeklyRollup.byDay,
      weekDayKeys,
      weekStartDay,
      weekEndDay,
      goalWorkoutsPerWeek: goals.strengthWorkoutsPerWeekGoal,
    });

    const cardio = computeWeeklyFitnessCardioMetricsFromFacts({
      factsByDay: dailyFactsWeeklyRollup.byDay,
      weekDayKeys,
      weekStartDay,
      weekEndDay,
      goalMilesPerWeek: goals.cardioMilesPerWeekGoal,
    });

    const sleep = computeWeeklyFitnessSleepMetrics({
      weekDayKeys,
      todayDayKey,
      sleepNightByDay: sleepRollup.sleepNightByDay,
      goalHoursPerNight: goals.sleepHoursPerNightGoal,
    });

    const readiness = computeWeeklyReadinessAverage({
      days: readinessRange.status === "partial" ? [] : readinessRange.days,
      elapsedDayKeys: weekNetworkDayKeys,
      rangeStatus:
        readinessRange.status === "partial"
          ? "partial"
          : readinessRange.status === "error"
            ? "error"
            : "ready",
      ouraConnection,
    });

    const nutrition = computeWeeklyNutritionLoggingCoverage({
      factsByDay: dailyFactsWeeklyRollup.byDay,
      elapsedDayKeys: weekNetworkDayKeys,
      rollupStatus: dailyFactsWeeklyRollup.status,
    });

    const stressDays: WeeklyStressDayInput[] = [];
    if (stressRange.status === "ready" || stressRange.status === "error") {
      for (const d of stressRange.days) {
        if (d.daySummary == null) continue;
        stressDays.push({
          day: d.day,
          daySummary: d.daySummary as OuraDailyStressSummary,
        });
      }
    }

    let stress = computeWeeklyStressBalancedCoverage({ days: stressDays });
    let stressState: "ready" | "no_data" | "connect_oura" | "reconnect_oura" | "error" | "loading" =
      stress.progress01 != null ? "ready" : "no_data";

    if (ouraConnection === "disconnected") {
      stress = {
        ...stress,
        progress01: null,
        displayValue: "Connect Oura",
        accessibilityLabel:
          "Stress, connect Oura, button. Opens Oura connection settings.",
      };
      stressState = "connect_oura";
    } else if (ouraConnection === "reconnect_required") {
      stress = {
        ...stress,
        progress01: null,
        displayValue: "Reconnect Oura",
        accessibilityLabel:
          "Stress, reconnect Oura, button. Opens Oura connection settings.",
      };
      stressState = "reconnect_oura";
    } else if (stressRange.status === "partial") {
      stress = {
        ...stress,
        progress01: null,
        displayValue: "\u2014",
        accessibilityLabel: "Stress, loading, button. Opens Stress analytics.",
      };
      stressState = "loading";
    } else if (stressRange.status === "error") {
      stress = {
        ...stress,
        progress01: null,
        displayValue: "Unavailable",
        accessibilityLabel: "Stress, unavailable, button. Opens Stress analytics.",
      };
      stressState = "error";
    }

    const metric: BodyCompositionPrimaryMetric | null = bodyGoal?.primaryMetric ?? null;
    let latestValue: number | null = null;
    const latestUnit = metric != null ? canonicalUnitForBodyCompositionMetric(metric) : null;
    if (metric === "weight") latestValue = body.overview.weightKg;
    else if (metric === "bodyFat") latestValue = body.overview.bodyFatPercent;
    else if (metric === "leanMass") latestValue = body.overview.leanBodyMassKg;

    return buildWeeklyFitnessCardModel({
      activity,
      strength,
      cardio,
      sleep,
      readiness,
      nutrition,
      stress: { ...stress, state: stressState },
      bodyGoal,
      latestTrusted: {
        metric,
        value: latestValue,
        unit: latestUnit,
        measuredAt: body.overview.latestObservedAtIso,
      },
    });
  }, [
    user,
    initializing,
    weekDayKeys,
    todayDayKey,
    rollupMergedForWeek,
    goals.activityStepsPerDayGoal,
    goals.strengthWorkoutsPerWeekGoal,
    goals.cardioMilesPerWeekGoal,
    goals.sleepHoursPerNightGoal,
    dailyFactsWeeklyRollup.byDay,
    dailyFactsWeeklyRollup.status,
    weekStartDay,
    weekEndDay,
    sleepRollup.sleepNightByDay,
    readinessRange,
    weekNetworkDayKeys,
    ouraConnection,
    stressRange,
    bodyGoal,
    body.overview.weightKg,
    body.overview.bodyFatPercent,
    body.overview.leanBodyMassKg,
    body.overview.latestObservedAtIso,
  ]);

  const activityLoading =
    enabled && stepsRollup.status === "partial" && Object.keys(displayRollup).length === 0;
  const dailyFactsLoading = enabled && dailyFactsWeeklyRollup.status === "partial";
  const sleepLoading = enabled && sleepRollup.status === "partial";
  const readinessLoading = enabled && readinessRange.status === "partial";
  const stressLoading = enabled && stressRange.status === "partial";

  const loading = Boolean(
    initializing || activityLoading || dailyFactsLoading || sleepLoading || readinessLoading || stressLoading,
  );

  const error = useMemo((): string | null => {
    if (!user || initializing || loading) return null;
    if (dailyFactsWeeklyRollup.status === "error") return dailyFactsWeeklyRollup.error;
    return null;
  }, [user, initializing, loading, dailyFactsWeeklyRollup]);

  return {
    loading,
    error,
    model,
    goals,
    goalsHref: WEEKLY_FITNESS_ROUTES.goalsEditor,
    baselineSource: {
      todayDayKey,
      rollupByDay: rollupMergedForWeek,
      availableRangeStart: weekStartDay,
      availableRangeEnd: weekEndDay,
    },
  };
}
