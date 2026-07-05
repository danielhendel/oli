import { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useActivityStepsRollupMap } from "@/lib/data/activity/ActivityRollupProvider";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  buildWeeklyFitnessProgressToGoalVm,
  type WeeklyFitnessProgressToGoalVm,
} from "@/lib/data/dash/buildWeeklyFitnessProgressToGoalVm";
import {
  computeWeeklyFitnessActivityMetrics,
  computeWeeklyFitnessCardioMetricsFromFacts,
  computeWeeklyFitnessCombinedProgress,
  computeWeeklyFitnessSleepMetrics,
  computeWeeklyFitnessStrengthMetricsFromFacts,
  sumWeeklyStrengthWorkoutsCountFromDailyFacts,
  weeklyFitnessGoalStatusForProgress,
  weeklyFitnessGoalStatusLabel,
  WEEKLY_FITNESS_BAR_FILL_COLOR,
  type WeeklyFitnessCombinedProgress,
  type WeeklyFitnessGoalStatus,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import { useWeeklyFitnessDailyFactsRollup } from "@/lib/data/dash/useWeeklyFitnessDailyFactsRollup";
import { networkDayKeysThroughToday } from "@/lib/dates/boundDayKeys";
import { isDebugDataLogsEnabled } from "@/lib/dev/debugDataLogs";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { resolveWeeklyFitnessGoals } from "@/lib/preferences/weeklyFitnessGoals";
import { useWeeklyFitnessSleepRollupMap } from "@/lib/data/dash/useWeeklyFitnessSleepRollupMap";
import { WEEKLY_FITNESS_ROUTES, type WeeklyFitnessRowKey } from "@/lib/data/dash/weeklyFitnessRoutes";
import type { DayKey } from "@/lib/ui/calendar/types";

export type { WeeklyFitnessRowKey } from "@/lib/data/dash/weeklyFitnessRoutes";
export { WEEKLY_FITNESS_ROUTES, weeklyFitnessMetricPageHref } from "@/lib/data/dash/weeklyFitnessRoutes";

export type WeeklyFitnessRow = {
  key: WeeklyFitnessRowKey;
  label: "Activity" | "Strength" | "Cardio" | "Sleep";
  /** Visible row value: actual completed only ("9,992 avg steps", "3 workouts", "2.6 miles"). */
  valueLabel: string;
  /** Accessibility phrase that includes goal context (e.g. "9,992 average steps, goal 10,000 steps per day"). */
  accessibilityValueLabel: string;
  /** 0..1 visual bar fill (clamped, even when value exceeds goal). */
  progress: number;
  /** Whether this row's category has a goal configured (>0). When false, bar is muted. */
  hasGoal: boolean;
  /** Domain bar accent color (matches existing palette). */
  barColor: string;
  /** Goal completion status for accessibility / optional pill. */
  status: WeeklyFitnessGoalStatus;
  statusLabel: string;
};

export type UseWeeklyFitnessCardResult = {
  loading: boolean;
  error: string | null;
  rows: WeeklyFitnessRow[];
  /** Combined Weekly Fitness completion across enabled (goal>0) categories. */
  combined: WeeklyFitnessCombinedProgress;
  /** Right-aligned progress-to-goal summary for the ring row (same source as rows). */
  progressToGoalVm: WeeklyFitnessProgressToGoalVm;
  /** Always present; resolves to defaults when no goals are persisted. */
  goals: ReturnType<typeof resolveWeeklyFitnessGoals>;
  /** Route for the "My goal" pressable. */
  goalsHref: string;
  /** Shared source data underlying Dash Weekly Fitness rows. */
  baselineSource: {
    todayDayKey: DayKey;
    rollupByDay: Readonly<ActivityStepsRollupMap>;
    /** Window the strength/cardio rows aggregate over (the current local week). */
    availableRangeStart: DayKey;
    availableRangeEnd: DayKey;
  };
};

/**
 * Dash Weekly Fitness card data source.
 *
 * **Workouts data path:** server-aggregated `dailyFacts.{strength.workoutsCount,
 * cardio.distanceMeters}` for the current week's day keys (7 lightweight
 * `GET /users/me/daily-facts?day=…` requests, de-duped via `dailyFactsSessionCache`).
 *
 * This hook intentionally does **not** call `useWorkoutsCalendarRange` or hydrate
 * raw workout payloads. Per the "Dashboard Weekly Fitness Timeout" audit, the legacy
 * year-wide raw-events hydrate (~0.5–1.5 MB, multiple paginated walks) was the root
 * cause of the "Could not load this week's data / Request timed out" failure.
 *
 * 404 dailyFacts docs (future or empty days) are treated as zero, never as errors.
 * The card surfaces an error only when at least one day produced a real
 * network/timeout/contract failure.
 */
export function useWeeklyFitnessCard(): UseWeeklyFitnessCardResult {
  const { user, initializing } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();

  const { state: prefState } = usePreferences();
  const weeklyGoalsStamp = prefState.preferences.weeklyFitnessGoals?.updatedAt;
  const goals = useMemo(
    () => resolveWeeklyFitnessGoals(prefState.preferences),
    [prefState.preferences, weeklyGoalsStamp],
  );

  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(todayDayKey), [todayDayKey]);
  const weekNetworkDayKeys = useMemo(
    () => networkDayKeysThroughToday(weekDayKeys, todayDayKey),
    [weekDayKeys, todayDayKey],
  );

  const stepsRollup = useActivityStepsRollupMap(todayDayKey, { registerStripAnchor: false });
  const displayRollup = stepsRollup.rollupDisplayByDay;

  const { hkToday } = useActivityHealthKitTodayStepsCard({
    todayDayKey,
    enabled: Boolean(user) && !initializing,
  });

  const rollupMergedForWeek = useMemo(() => {
    const m = { ...displayRollup };
    if (user && hkToday.status === "ready" && typeof hkToday.steps === "number") {
      m[todayDayKey] = { kind: "numeric" as const, steps: hkToday.steps };
    }
    return m;
  }, [displayRollup, hkToday, todayDayKey, user]);

  const weekStartDay = weekDayKeys[0]!;
  const weekEndDay = weekDayKeys[weekDayKeys.length - 1]!;

  const dailyFactsWeeklyRollup = useWeeklyFitnessDailyFactsRollup(weekNetworkDayKeys);

  const sleepRollup = useWeeklyFitnessSleepRollupMap(weekNetworkDayKeys);

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `weeklyFitnessSteps:${Date.now()}` });
      sleepRollup.refetch({ cacheBust: `weeklyFitnessSleep:${Date.now()}` });
      dailyFactsWeeklyRollup.refetch({ cacheBust: `weeklyFitnessDailyFacts:${Date.now()}` });
    }, [dailyFactsWeeklyRollup.refetch, sleepRollup.refetch, stepsRollup.refetch]),
  );

  const { rows, combined, progressToGoalVm } = useMemo((): {
    rows: WeeklyFitnessRow[];
    combined: WeeklyFitnessCombinedProgress;
    progressToGoalVm: WeeklyFitnessProgressToGoalVm;
  } => {
    const activity = computeWeeklyFitnessActivityMetrics({
      weekDayKeys,
      todayDayKey,
      rollupByDay: rollupMergedForWeek,
      goalStepsPerDay: goals.activityStepsPerDayGoal,
    });

    const strengthFactsInput = {
      factsByDay: dailyFactsWeeklyRollup.byDay,
      weekDayKeys,
      weekStartDay,
      weekEndDay,
    };
    const strength = computeWeeklyFitnessStrengthMetricsFromFacts({
      ...strengthFactsInput,
      goalWorkoutsPerWeek: goals.strengthWorkoutsPerWeekGoal,
    });

    if (__DEV__ && isDebugDataLogsEnabled()) {
      const { perDay, total } = sumWeeklyStrengthWorkoutsCountFromDailyFacts(strengthFactsInput);
      // eslint-disable-next-line no-console
      console.log("[WEEKLY_FITNESS_STRENGTH_TOTAL]", {
        weekStartDay,
        weekEndDay,
        perDayStrengthWorkoutsCount: perDay,
        computedWeeklyTotal: total,
        renderedValueLabel: strength.valueLabel,
      });
    }

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

    const activityStatus = weeklyFitnessGoalStatusForProgress(activity.goalProgress01);
    const strengthStatus = weeklyFitnessGoalStatusForProgress(strength.goalProgress01);
    const cardioStatus = weeklyFitnessGoalStatusForProgress(cardio.goalProgress01);
    const sleepStatus = weeklyFitnessGoalStatusForProgress(sleep.goalProgress01);

    const computedRows: WeeklyFitnessRow[] = [
      {
        key: "activity",
        label: "Activity",
        valueLabel: activity.valueLabel,
        accessibilityValueLabel: activity.accessibilityValueLabel,
        progress: activity.goalProgress01,
        hasGoal: activity.goalStepsPerDay > 0,
        barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
        status: activityStatus,
        statusLabel: weeklyFitnessGoalStatusLabel(activityStatus),
      },
      {
        key: "strength",
        label: "Strength",
        valueLabel: strength.valueLabel,
        accessibilityValueLabel: strength.accessibilityValueLabel,
        progress: strength.goalProgress01,
        hasGoal: strength.goalWorkoutsPerWeek > 0,
        barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
        status: strengthStatus,
        statusLabel: weeklyFitnessGoalStatusLabel(strengthStatus),
      },
      {
        key: "cardio",
        label: "Cardio",
        valueLabel: cardio.valueLabel,
        accessibilityValueLabel: cardio.accessibilityValueLabel,
        progress: cardio.goalProgress01,
        hasGoal: cardio.goalMilesPerWeek > 0,
        barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
        status: cardioStatus,
        statusLabel: weeklyFitnessGoalStatusLabel(cardioStatus),
      },
      {
        key: "sleep",
        label: "Sleep",
        valueLabel: sleep.valueLabel,
        accessibilityValueLabel: sleep.accessibilityValueLabel,
        progress: sleep.goalProgress01,
        hasGoal: sleep.goalHoursPerNight > 0,
        barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
        status: sleepStatus,
        statusLabel: weeklyFitnessGoalStatusLabel(sleepStatus),
      },
    ];

    const combinedNext = computeWeeklyFitnessCombinedProgress({
      activity,
      strength,
      cardio,
      sleep,
    });

    const progressToGoalVmNext = buildWeeklyFitnessProgressToGoalVm({
      activity,
      strength,
      cardio,
      sleep,
    });

    return { rows: computedRows, combined: combinedNext, progressToGoalVm: progressToGoalVmNext };
  }, [
    dailyFactsWeeklyRollup.byDay,
    goals.activityStepsPerDayGoal,
    goals.cardioMilesPerWeekGoal,
    goals.sleepHoursPerNightGoal,
    goals.strengthWorkoutsPerWeekGoal,
    rollupMergedForWeek,
    sleepRollup.sleepNightByDay,
    todayDayKey,
    weekDayKeys,
    weekEndDay,
    weekStartDay,
  ]);

  const activityLoading =
    Boolean(user) &&
    !initializing &&
    stepsRollup.status === "partial" &&
    Object.keys(displayRollup).length === 0;

  const dailyFactsLoading =
    Boolean(user) && !initializing && dailyFactsWeeklyRollup.status === "partial";

  const sleepLoading = Boolean(user) && !initializing && sleepRollup.status === "partial";

  const loading = Boolean(initializing || activityLoading || dailyFactsLoading || sleepLoading);

  const error = useMemo((): string | null => {
    if (!user || initializing || loading) return null;
    if (dailyFactsWeeklyRollup.status === "error") return dailyFactsWeeklyRollup.error;
    return null;
  }, [user, initializing, loading, dailyFactsWeeklyRollup]);

  return {
    loading,
    error,
    rows,
    combined,
    progressToGoalVm,
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
