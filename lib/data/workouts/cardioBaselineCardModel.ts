import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  aggregateDisplayableCardioForCalendarDays,
  averagePerWeekFromTotals,
} from "@/lib/data/workouts/cardioRangeMetrics";
import {
  cardioDistanceTierFromWeeklyMiles,
  type CardioDistanceTier,
} from "@/lib/data/workouts/cardioSessionPresentation";
import { filterWorkoutCalendarDaysInclusive } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";
import { CARDIO_WEEKLY_MILES_DISPLAY_MAX } from "@/lib/ui/workouts/cardioBaselineScale";

export type CardioBaselineTier = CardioDistanceTier;

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
  /** Display scale input for weekly miles (capped at {@link CARDIO_WEEKLY_MILES_DISPLAY_MAX} for bar geometry). */
  progressMilesPerWeekScaleValue: number;
};

export type CardioBaselineCardModel = { kind: "insufficient_data" } | CardioBaselineCardModelReady;

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
    tier: cardioDistanceTierFromWeeklyMiles(averageMilesPerWeek90d),
    formattedAverageMilesPerWeek: formatMilesPerWeek(averageMilesPerWeek90d),
    formattedAverageMinutesPerWeek: formatMinutesPerWeek(averageMinutesPerWeek90d),
    headlineLabel: `${averageMilesPerWeek90d.toFixed(1)} mi per week`,
    progressMilesPerWeekScaleValue: Math.min(
      CARDIO_WEEKLY_MILES_DISPLAY_MAX,
      Math.max(0, averageMilesPerWeek90d),
    ),
  };
}
