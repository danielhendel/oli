/**
 * Pure builders for Strength analytics cards (weekly muscle, monthly/yearly charts).
 * Single place so overview and analytics-detail stay aligned.
 */

import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import {
  buildWeeklyStrengthCardModel,
  type WeeklySessionDisplayHint,
  type WeeklyStrengthCardModel,
} from "@/lib/data/workouts/weeklyStrengthCardModel";
import {
  buildStrengthMonthOverviewFromCalendarDays,
  type StrengthMonthChartBar,
  type StrengthMonthScopedMetrics,
} from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import { buildStrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import {
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  monthKeyFromDay,
  type WorkoutAnalyticsMetrics,
  type WorkoutAnalyticsMonthPoint,
  type WorkoutCalendarDayLike,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { mapWorkoutCalendarDaysForDomain, type WorkoutProductDomain } from "@/lib/data/workouts/workoutDomain";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

export type BuildStrengthAnalyticsCardModelsInput = {
  domain: WorkoutProductDomain;
  analyticsDaysSlice: WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  manualWorkoutSummaries: readonly ManualWorkoutDaySummary[];
  customExerciseById: ReadonlyMap<string, CustomExerciseRecord>;
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  weeklySessionDisplayHints: readonly WeeklySessionDisplayHint[];
  weekKey?: string;
};

export type StrengthAnalyticsCardModels = {
  weeklyStrengthModel: WeeklyStrengthCardModel;
  strengthMonthOverview: {
    chartBars: StrengthMonthChartBar[];
    metrics: StrengthMonthScopedMetrics;
  };
  yearChartPoints: WorkoutAnalyticsMonthPoint[];
  yearMetrics: WorkoutAnalyticsMetrics;
  focusStrengthMonthKey: string;
  /** Same Strength Baseline rate as the overview card — for yearly chart reference only. */
  strengthBaselineAvgWorkoutsPerWeek: number;
};

export function buildStrengthAnalyticsCardModels(
  input: BuildStrengthAnalyticsCardModelsInput,
): StrengthAnalyticsCardModels | null {
  if (input.domain !== "strength") return null;

  const focusStrengthMonthKey = monthKeyFromDay(input.todayDayKey);
  const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays(input.analyticsDaysSlice, {
    todayDayKey: input.todayDayKey,
  });
  const strengthMonthOverview = buildStrengthMonthOverviewFromCalendarDays(
    input.analyticsDaysSlice,
    focusStrengthMonthKey,
    {
      todayDayKey: input.todayDayKey,
      manualJournalSummaries: input.manualWorkoutSummaries,
    },
  );
  const weeklyStrengthModel = buildWeeklyStrengthCardModel([...input.manualWorkoutSummaries], {
    weekStartDay: input.weekStartDay,
    weekEndDay: input.weekEndDay,
    weekKey: input.weekKey ?? `${input.weekStartDay}..${input.weekEndDay}`,
    sessionDisplayHints: input.weeklySessionDisplayHints,
    analyticsContext: { customExerciseById: input.customExerciseById },
  });

  const strengthBaselineModel = buildStrengthBaselineCardModel({
    strengthCalendarDays: mapWorkoutCalendarDaysForDomain(input.analyticsDaysSlice, "strength"),
    todayDayKey: input.todayDayKey,
  });

  return {
    weeklyStrengthModel,
    strengthMonthOverview,
    yearChartPoints: bundle.chartPointsByTab.strength,
    yearMetrics: bundle.metricsByTab.strength,
    focusStrengthMonthKey,
    strengthBaselineAvgWorkoutsPerWeek: strengthBaselineModel.avgWorkoutsPerWeek,
  };
}
