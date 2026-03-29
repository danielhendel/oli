/**
 * Calendar + journal inputs for the Strength Analytics screen (mirrors overview analytics slice).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { InteractionManager } from "react-native";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import {
  filterWorkoutCalendarDaysInclusive,
  overviewSharedRangeBounds,
} from "@/lib/data/workouts/overviewCalendarRangeSlices";
import {
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import {
  buildStrengthAnalyticsCardModels,
  type StrengthAnalyticsCardModels,
} from "@/lib/data/workouts/strengthAnalyticsCardModels";
import {
  listManualWorkoutDaySummaries,
  type ManualWorkoutDaySummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  listCustomExercises,
  type CustomExerciseRecord,
} from "@/lib/workouts/exercises/customExerciseStore";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import { resolveWorkoutDisplay } from "@/lib/data/workouts/workoutDisplay";
import { getRecentWorkoutSessionsFromCalendarDays } from "@/lib/data/workouts/workoutsCalendarModel";
import type { WeeklySessionDisplayHint } from "@/lib/data/workouts/weeklyStrengthCardModel";

function runAfterInteractionsSafe(task: () => void): { cancel: () => void } {
  const run = InteractionManager?.runAfterInteractions;
  if (typeof run === "function") {
    return run(task);
  }
  task();
  return { cancel: () => void 0 };
}

export type StrengthAnalyticsDetailScreenData = {
  models: StrengthAnalyticsCardModels | null;
  calendarReady: boolean;
};

/**
 * Loads the same derived calendar slice + manual summaries as the Strength overview
 * so analytics cards match overview behavior without duplicating presentation.
 */
export function useStrengthAnalyticsDetailScreenData(uid: string | undefined): StrengthAnalyticsDetailScreenData {
  const today = getTodayDayKeyLocal();
  const weekDaysFull = getWeekDaysForAnchor(today);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const recentRangeStart = addCalendarDaysToDayKey(today, -120);
  const recentRangeEnd = today;
  const analyticsRangeStart = WORKOUT_OVERVIEW_ANALYTICS_RANGE_START;
  const analyticsRangeEnd = WORKOUT_OVERVIEW_ANALYTICS_RANGE_END;

  const [refreshEpoch, setRefreshEpoch] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRefreshEpoch((n) => n + 1);
    }, []),
  );

  const { start: overviewRangeStart, end: overviewRangeEnd } = useMemo(
    () =>
      overviewSharedRangeBounds({
        weekStart,
        weekEnd,
        recentStart: recentRangeStart,
        recentEnd: recentRangeEnd,
        analyticsStart: analyticsRangeStart,
        analyticsEnd: analyticsRangeEnd,
      }),
    [weekStart, weekEnd, recentRangeStart, recentRangeEnd, analyticsRangeStart, analyticsRangeEnd],
  );

  const calendarRangeOptions = useMemo(
    () => ({
      refreshEpoch,
      rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
      debugHydrateLabel: "strength-analytics-detail" as const,
    }),
    [refreshEpoch],
  );

  const overviewSharedRange = useWorkoutsCalendarRange(
    overviewRangeStart,
    overviewRangeEnd,
    calendarRangeOptions,
  );

  const sharedDays = overviewSharedRange.status === "ready" ? overviewSharedRange.days : [];

  const domainSharedDays = useMemo(
    () => mapWorkoutCalendarDaysForDomain(sharedDays, "strength"),
    [sharedDays],
  );

  const weekDaysSlice = useMemo(
    () => filterWorkoutCalendarDaysInclusive(domainSharedDays, weekStart, weekEnd),
    [domainSharedDays, weekStart, weekEnd],
  );
  const recentDaysSlice = useMemo(
    () => filterWorkoutCalendarDaysInclusive(domainSharedDays, recentRangeStart, recentRangeEnd),
    [domainSharedDays, recentRangeStart, recentRangeEnd],
  );
  const analyticsDaysSlice = useMemo(
    () => filterWorkoutCalendarDaysInclusive(domainSharedDays, analyticsRangeStart, analyticsRangeEnd),
    [domainSharedDays, analyticsRangeStart, analyticsRangeEnd],
  );

  const recentWorkouts = useMemo(() => {
    if (overviewSharedRange.status !== "ready") return [];
    return getRecentWorkoutSessionsFromCalendarDays(recentDaysSlice, 7);
  }, [overviewSharedRange.status, recentDaysSlice]);

  const weekWorkoutIds = useMemo(
    () =>
      weekDaysSlice.flatMap((d) =>
        reconcileWorkoutSessionsForDay(d.day, d.workouts).flatMap((s) => s.workouts.map((w) => w.id)),
      ),
    [weekDaysSlice],
  );

  const recentWorkoutIds = useMemo(
    () => recentWorkouts.map((entry) => entry.session.workouts[0]?.id ?? entry.session.id),
    [recentWorkouts],
  );

  const workoutIdsForOverrides = useMemo(() => {
    const uniq = new Set<string>();
    for (const id of recentWorkoutIds) uniq.add(id);
    for (const id of weekWorkoutIds) uniq.add(id);
    return [...uniq];
  }, [recentWorkoutIds, weekWorkoutIds]);

  const { overridesByWorkoutId } = useWorkoutOverrides(workoutIdsForOverrides);

  const weeklySessionDisplayHints = useMemo<WeeklySessionDisplayHint[]>(
    () =>
      weekDaysSlice.flatMap((d) =>
        reconcileWorkoutSessionsForDay(d.day, d.workouts).map((session) => {
          const representative = session.workouts[0];
          if (!representative) {
            return {
              day: d.day,
              startAt: session.start,
              displayTitle: "Workout",
            };
          }
          const resolved = resolveWorkoutDisplay(
            representative,
            overridesByWorkoutId[representative.id] ?? null,
          );
          return {
            day: d.day,
            startAt: session.start ?? representative.start ?? representative.observedAt ?? null,
            displayTitle: resolved.displayTitle,
          };
        }),
      ),
    [weekDaysSlice, overridesByWorkoutId],
  );

  const [manualWorkoutSummaries, setManualWorkoutSummaries] = useState<ManualWorkoutDaySummary[]>([]);
  const [customExerciseById, setCustomExerciseById] = useState<ReadonlyMap<string, CustomExerciseRecord>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    if (process.env.JEST_WORKER_ID) return;
    if (overviewSharedRange.status !== "ready") return;
    if (!uid) {
      setManualWorkoutSummaries([]);
      setCustomExerciseById(new Map());
      return;
    }
    const task = runAfterInteractionsSafe(() => {
      void Promise.all([listManualWorkoutDaySummaries(uid), listCustomExercises(uid)]).then(([rows, customRows]) => {
        if (cancelled) return;
        setManualWorkoutSummaries(rows);
        setCustomExerciseById(new Map(customRows.map((r) => [r.exerciseId, r])));
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [overviewSharedRange.status, uid]);

  const models = useMemo(() => {
    if (!uid) return null;
    return buildStrengthAnalyticsCardModels({
      domain: "strength",
      analyticsDaysSlice: overviewSharedRange.status === "ready" ? analyticsDaysSlice : [],
      todayDayKey: today,
      manualWorkoutSummaries,
      customExerciseById,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      weekKey: `${weekStart}..${weekEnd}`,
      weeklySessionDisplayHints,
    });
  }, [
    uid,
    overviewSharedRange.status,
    analyticsDaysSlice,
    today,
    manualWorkoutSummaries,
    customExerciseById,
    weekStart,
    weekEnd,
    weeklySessionDisplayHints,
  ]);

  return {
    models,
    calendarReady: overviewSharedRange.status === "ready",
  };
}
