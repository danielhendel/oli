import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  aggregateDisplayableCardioForCalendarDays,
  averagePerWeekFromTotals,
} from "@/lib/data/workouts/cardioRangeMetrics";
import { filterWorkoutCalendarDaysInclusive } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import { formatCardioWeeklyDistanceAndMinutes } from "@/lib/data/workouts/cardioSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";

const CARDIO_BASELINE_MAX_PROGRESS_MILES_PER_WEEK = 25;

export type CardioBaselineTier = "very_low" | "low" | "active" | "high" | "very_high";

export type CardioBaselineCardModelReady = {
  kind: "ready";
  averageMilesPerWeek90d: number;
  totalMiles90d: number;
  sessions90d: number;
  totalMinutes90d: number;
  averageMinutesPerWeek90d: number;
  tier: CardioBaselineTier;
  formattedAverageMilesPerWeek: string;
  formattedAverageMinutesPerWeek: string;
  headlineLabel: string;
  /** 0..25+ display scale value (capped at 25 for progress fill). */
  progressMilesPerWeekScaleValue: number;
};

export type CardioBaselineCardModel =
  | { kind: "insufficient_data" }
  | CardioBaselineCardModelReady;

function cardioTierFromMilesPerWeek(avgMilesPerWeek: number): CardioBaselineTier {
  if (avgMilesPerWeek <= 2.4) return "very_low";
  if (avgMilesPerWeek <= 7.4) return "low";
  if (avgMilesPerWeek <= 14.9) return "active";
  if (avgMilesPerWeek <= 24.9) return "high";
  return "very_high";
}

function formatMilesPerWeek(avgMilesPerWeek: number): string {
  return `${avgMilesPerWeek.toFixed(1)} mi/wk`;
}

function formatMinutesPerWeek(avgMinutesPerWeek: number): string {
  return `${Math.round(avgMinutesPerWeek)} min/wk`;
}

/**
 * Cardio Baseline: average cardio miles/week over the trailing 90 completed local days
 * ending on local yesterday (today excluded by construction).
 */
export function buildCardioBaselineCardModel(input: {
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
}): CardioBaselineCardModel {
  const anchorEnd = getActivityOverviewAnchorEndDay(input.todayDayKey);
  const windowKeys = activityTrailingNDaysInclusive(anchorEnd, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
  const windowStart = windowKeys[0]!;
  const sortedDays = [...input.cardioCalendarDays].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const slice = filterWorkoutCalendarDaysInclusive(sortedDays, windowStart, anchorEnd);

  const totals = aggregateDisplayableCardioForCalendarDays(slice);
  const totalMiles90d = totals.totalMiles;
  const totalMinutes90d = totals.totalMinutes;
  const sessions90d = totals.sessionCount;
  const averageMilesPerWeek90d = averagePerWeekFromTotals(totalMiles90d, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
  const averageMinutesPerWeek90d = averagePerWeekFromTotals(totalMinutes90d, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);

  if (sessions90d <= 0 || (totalMiles90d <= 0 && totalMinutes90d <= 0)) {
    return { kind: "insufficient_data" };
  }

  return {
    kind: "ready",
    averageMilesPerWeek90d,
    totalMiles90d,
    sessions90d,
    totalMinutes90d,
    averageMinutesPerWeek90d,
    tier: cardioTierFromMilesPerWeek(averageMilesPerWeek90d),
    formattedAverageMilesPerWeek: formatMilesPerWeek(averageMilesPerWeek90d),
    formattedAverageMinutesPerWeek: formatMinutesPerWeek(averageMinutesPerWeek90d),
    headlineLabel: formatCardioWeeklyDistanceAndMinutes({
      averageMilesPerWeek: averageMilesPerWeek90d,
      averageMinutesPerWeek: averageMinutesPerWeek90d,
    }),
    progressMilesPerWeekScaleValue: Math.min(
      CARDIO_BASELINE_MAX_PROGRESS_MILES_PER_WEEK,
      Math.max(0, averageMilesPerWeek90d),
    ),
  };
}
