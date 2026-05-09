import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { useActivityStepsRollupMap } from "@/lib/data/activity/ActivityRollupProvider";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import {
  buildWeeklyFitnessProgressToGoalVm,
  type WeeklyFitnessProgressToGoalVm,
} from "@/lib/data/dash/buildWeeklyFitnessProgressToGoalVm";
import {
  computeWeeklyFitnessActivityMetrics,
  computeWeeklyFitnessCardioMetrics,
  computeWeeklyFitnessCombinedProgress,
  computeWeeklyFitnessStrengthMetrics,
  weeklyFitnessGoalStatusForProgress,
  weeklyFitnessGoalStatusLabel,
  WEEKLY_FITNESS_BAR_FILL_COLOR,
  type WeeklyFitnessCombinedProgress,
  type WeeklyFitnessGoalStatus,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { resolveWeeklyFitnessGoals } from "@/lib/preferences/weeklyFitnessGoals";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Dash "Weekly Fitness" goal-progress rows — tapping opens qualitative modal explainers.
 */
export const WEEKLY_FITNESS_ROUTES = {
  /** "My goal" pressable; user-editable Dash Weekly Fitness goals. */
  goalsEditor: "/(app)/fitness-goals",
} as const;

export type WeeklyFitnessRowKey = "activity" | "strength" | "cardio";

export type WeeklyFitnessRow = {
  key: WeeklyFitnessRowKey;
  label: "Activity" | "Strength" | "Cardio";
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
  /** Shared source data for rows + explainer baseline cards. */
  baselineSource: {
    todayDayKey: DayKey;
    rollupByDay: Readonly<ActivityStepsRollupMap>;
    strengthCalendarDays: readonly WorkoutCalendarDayLike[];
    cardioCalendarDays: readonly WorkoutCalendarDayLike[];
    availableRangeStart: DayKey;
    availableRangeEnd: DayKey;
  };
};


export function useWeeklyFitnessCard(): UseWeeklyFitnessCardResult {
  const { user, initializing, getIdToken } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();

  const { state: prefState } = usePreferences();
  const goals = useMemo(
    () => resolveWeeklyFitnessGoals(prefState.preferences),
    [prefState.preferences],
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

  const scheduleActivityStepsRepair = useCallback(() => {
    if (Platform.OS !== "ios" || !user || initializing) return;
    scheduleAppleHealthStepsRepair({ trigger: "recovery", getIdToken, userUid: user.uid });
  }, [getIdToken, initializing, user]);

  const [workoutRefreshEpoch, setWorkoutRefreshEpoch] = useState(0);
  const bumpWorkoutRefresh = useCallback(() => {
    setWorkoutRefreshEpoch((n) => n + 1);
  }, []);

  const { start: overviewRangeStart, end: overviewRangeEnd } = useMemo(
    () => computeWorkoutOverviewSharedCalendarRange(todayDayKey),
    [todayDayKey],
  );

  const calendarOptions = useMemo(
    () => ({
      refreshEpoch: workoutRefreshEpoch,
      rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
      debugHydrateLabel: "dash-weekly-fitness" as const,
    }),
    [workoutRefreshEpoch],
  );

  const overviewSharedRange = useWorkoutsCalendarRange(overviewRangeStart, overviewRangeEnd, calendarOptions);

  useFocusEffect(
    useCallback(() => {
      void stepsRollup.refetch({ cacheBust: `weeklyFitnessSteps:${Date.now()}` });
      scheduleActivityStepsRepair();
      bumpWorkoutRefresh();
    }, [bumpWorkoutRefresh, scheduleActivityStepsRepair, stepsRollup.refetch]),
  );

  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(todayDayKey), [todayDayKey]);
  const weekStartDay = weekDayKeys[0]!;
  const weekEndDay = weekDayKeys[weekDayKeys.length - 1]!;

  const strengthCalendarDays = useMemo(() => {
    if (overviewSharedRange.status !== "ready") return [];
    return mapWorkoutCalendarDaysForDomain(overviewSharedRange.days, "strength");
  }, [overviewSharedRange]);

  const cardioCalendarDays = useMemo(() => {
    if (overviewSharedRange.status !== "ready") return [];
    return mapWorkoutCalendarDaysForDomain(overviewSharedRange.days, "cardio");
  }, [overviewSharedRange]);

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

    const strength = computeWeeklyFitnessStrengthMetrics({
      strengthCalendarDays,
      todayDayKey,
      weekStartDay,
      weekEndDay,
      goalWorkoutsPerWeek: goals.strengthWorkoutsPerWeekGoal,
    });

    const cardio = computeWeeklyFitnessCardioMetrics({
      cardioCalendarDays,
      weekStartDay,
      weekEndDay,
      goalMilesPerWeek: goals.cardioMilesPerWeekGoal,
    });

    const activityStatus = weeklyFitnessGoalStatusForProgress(activity.goalProgress01);
    const strengthStatus = weeklyFitnessGoalStatusForProgress(strength.goalProgress01);
    const cardioStatus = weeklyFitnessGoalStatusForProgress(cardio.goalProgress01);

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
    ];

    const combinedNext = computeWeeklyFitnessCombinedProgress({
      activity,
      strength,
      cardio,
    });

    const progressToGoalVmNext = buildWeeklyFitnessProgressToGoalVm({
      activity,
      strength,
      cardio,
    });

    return { rows: computedRows, combined: combinedNext, progressToGoalVm: progressToGoalVmNext };
  }, [
    cardioCalendarDays,
    goals.activityStepsPerDayGoal,
    goals.cardioMilesPerWeekGoal,
    goals.strengthWorkoutsPerWeekGoal,
    rollupMergedForWeek,
    strengthCalendarDays,
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

  const calendarLoading =
    Boolean(user) && !initializing && overviewSharedRange.status === "partial";

  const loading = Boolean(initializing || activityLoading || calendarLoading);

  const error = useMemo((): string | null => {
    if (!user || initializing || loading) return null;
    if (overviewSharedRange.status === "error") return overviewSharedRange.error;
    return null;
  }, [user, initializing, loading, overviewSharedRange]);

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
      strengthCalendarDays,
      cardioCalendarDays,
      availableRangeStart: overviewRangeStart,
      availableRangeEnd: overviewRangeEnd,
    },
  };
}
