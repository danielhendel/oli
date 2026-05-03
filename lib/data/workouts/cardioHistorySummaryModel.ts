import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  aggregateDisplayableCardioForInclusiveDayRange,
  averagePerWeekFromTotals,
} from "@/lib/data/workouts/cardioRangeMetrics";
import {
  cardioDistanceTierFromWeeklyMiles,
  cardioDistanceTierLabel,
  cardioDistanceTierIndexForBar,
} from "@/lib/data/workouts/cardioSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import { cardioBaselineMilesToVisualScale01 } from "@/lib/ui/workouts/cardioBaselineScale";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type CardioHistoryRangeKey = "thisWeek" | "day30" | "day90" | "ytd" | "month12";

export type CardioHistorySummaryRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

export type CardioHistorySummaryRow = {
  key: CardioHistoryRangeKey;
  label: CardioHistorySummaryRowLabel;
  hasEnoughData: boolean;
  totalMiles: number | null;
  averageMilesPerWeek: number | null;
  totalMinutes: number | null;
  averageMinutesPerWeek: number | null;
  displayValue: string;
  tierLabel: string | null;
  tierIndexForBar: number | null;
  progressFill01: number | null;
  helperText?: string;
};

export type CardioHistorySummaryModel = {
  rows: readonly CardioHistorySummaryRow[];
};

function trailingCalendarDaysThroughToday(todayDayKey: DayKey, dayCount: number): { rangeStart: DayKey; rangeEnd: DayKey } {
  const keys = activityTrailingNDaysInclusive(todayDayKey, dayCount);
  return { rangeStart: keys[0]!, rangeEnd: todayDayKey };
}

function formatHistoryDisplayValue(averageMilesPerWeek: number): string {
  if (!Number.isFinite(averageMilesPerWeek) || averageMilesPerWeek <= 0) return "—";
  return `${averageMilesPerWeek.toFixed(1)} mi per week`;
}

function buildRow(args: {
  key: CardioHistoryRangeKey;
  label: CardioHistorySummaryRowLabel;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  availableStart: DayKey;
  availableEnd: DayKey;
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
}): CardioHistorySummaryRow {
  const covered = args.rangeStart >= args.availableStart && args.rangeEnd <= args.availableEnd;
  if (!covered) {
    return {
      key: args.key,
      label: args.label,
      hasEnoughData: false,
      totalMiles: null,
      averageMilesPerWeek: null,
      totalMinutes: null,
      averageMinutesPerWeek: null,
      displayValue: "—",
      tierLabel: null,
      tierIndexForBar: null,
      progressFill01: null,
      ...(args.key === "month12"
        ? { helperText: "Data will appear when enough history is available" }
        : {}),
    };
  }

  const daysInRange = enumerateDaysInclusive(args.rangeStart, args.rangeEnd);
  const dayCount = daysInRange.length;
  const totals = aggregateDisplayableCardioForInclusiveDayRange(
    args.cardioCalendarDays,
    args.rangeStart,
    args.rangeEnd,
  );
  const { totalMiles, totalMinutes } = totals;
  const weeklyMiles = averagePerWeekFromTotals(totalMiles, dayCount);
  const weeklyMinutes = averagePerWeekFromTotals(totalMinutes, dayCount);
  const tier = cardioDistanceTierFromWeeklyMiles(weeklyMiles);
  return {
    key: args.key,
    label: args.label,
    hasEnoughData: true,
    totalMiles,
    averageMilesPerWeek: weeklyMiles,
    totalMinutes,
    averageMinutesPerWeek: weeklyMinutes,
    displayValue: formatHistoryDisplayValue(weeklyMiles),
    tierLabel: cardioDistanceTierLabel(tier),
    tierIndexForBar: cardioDistanceTierIndexForBar(tier),
    progressFill01: cardioBaselineMilesToVisualScale01(weeklyMiles),
  };
}

/**
 * Cardio overview “Baseline” table: average displayable cardio miles & minutes per week per time window.
 * **7 Day** = trailing {@link ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT} local days through today (same rolling pattern as 30 Day).
 * The separate Cardio “This Week” list card remains calendar-week based (workouts overview).
 */
export function buildCardioHistorySummaryModel(input: {
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  availableRangeStart: DayKey;
  availableRangeEnd: DayKey;
}): CardioHistorySummaryModel {
  const { todayDayKey, availableRangeStart: avStart, availableRangeEnd: avEnd } = input;

  const day7 = trailingCalendarDaysThroughToday(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const day30 = trailingCalendarDaysThroughToday(todayDayKey, 30);

  const anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey);
  const day90Keys = activityTrailingNDaysInclusive(anchorYesterday, 90);
  const day90 = { rangeStart: day90Keys[0]!, rangeEnd: anchorYesterday };

  const ytdStart = `${todayDayKey.slice(0, 4)}-01-01` as DayKey;
  const ytd = { rangeStart: ytdStart, rangeEnd: todayDayKey };

  const day365 = trailingCalendarDaysThroughToday(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);

  const rows: CardioHistorySummaryRow[] = [
    buildRow({
      key: "thisWeek",
      label: "7 Day",
      rangeStart: day7.rangeStart,
      rangeEnd: day7.rangeEnd,
      availableStart: avStart,
      availableEnd: avEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "day30",
      label: "30 Day",
      rangeStart: day30.rangeStart,
      rangeEnd: day30.rangeEnd,
      availableStart: avStart,
      availableEnd: avEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "day90",
      label: "90 Day",
      rangeStart: day90.rangeStart,
      rangeEnd: day90.rangeEnd,
      availableStart: avStart,
      availableEnd: avEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "ytd",
      label: "YTD",
      rangeStart: ytd.rangeStart,
      rangeEnd: ytd.rangeEnd,
      availableStart: avStart,
      availableEnd: avEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "month12",
      label: "12 Month",
      rangeStart: day365.rangeStart,
      rangeEnd: day365.rangeEnd,
      availableStart: avStart,
      availableEnd: avEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
  ];

  return { rows };
}
