import { activityTrailingNDaysInclusive, getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
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

export type CardioHistoryRangeKey = "day7" | "day30" | "ytd" | "month12";

export type CardioHistorySummaryRow = {
  key: CardioHistoryRangeKey;
  label: "7 Day" | "30 Day" | "YTD" | "12 Month";
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

function ytdStartFor(anchorEndDay: DayKey): DayKey {
  return `${anchorEndDay.slice(0, 4)}-01-01` as DayKey;
}

function formatHistoryDisplayValue(input: {
  averageMilesPerWeek: number;
  averageMinutesPerWeek: number;
}): string {
  const miles =
    Number.isFinite(input.averageMilesPerWeek) && input.averageMilesPerWeek > 0
      ? `${input.averageMilesPerWeek.toFixed(1)} mi`
      : null;
  const minutes =
    Number.isFinite(input.averageMinutesPerWeek) && input.averageMinutesPerWeek > 0
      ? `${Math.round(input.averageMinutesPerWeek)} min/wk`
      : null;
  if (miles && minutes) return `${miles} · ${minutes}`;
  if (miles) return `${miles}/wk`;
  if (minutes) return minutes;
  return "—";
}

function buildRow(args: {
  key: CardioHistoryRangeKey;
  label: CardioHistorySummaryRow["label"];
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
  const totals = aggregateDisplayableCardioForInclusiveDayRange(
    args.cardioCalendarDays,
    args.rangeStart,
    args.rangeEnd,
  );
  const { totalMiles, totalMinutes } = totals;
  const dayCount = daysInRange.length;
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
    displayValue: formatHistoryDisplayValue({
      averageMilesPerWeek: weeklyMiles,
      averageMinutesPerWeek: weeklyMinutes,
    }),
    tierLabel: cardioDistanceTierLabel(tier),
    tierIndexForBar: cardioDistanceTierIndexForBar(tier),
    progressFill01: cardioBaselineMilesToVisualScale01(weeklyMiles),
  };
}

export function buildCardioHistorySummaryModel(input: {
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  availableRangeStart: DayKey;
  availableRangeEnd: DayKey;
}): CardioHistorySummaryModel {
  const anchorEnd = getActivityOverviewAnchorEndDay(input.todayDayKey);
  const day7 = activityTrailingNDaysInclusive(anchorEnd, 7);
  const day30 = activityTrailingNDaysInclusive(anchorEnd, 30);
  const day365 = activityTrailingNDaysInclusive(anchorEnd, 365);
  const ytdStart = ytdStartFor(anchorEnd);

  const rows: CardioHistorySummaryRow[] = [
    buildRow({
      key: "day7",
      label: "7 Day",
      rangeStart: day7[0]!,
      rangeEnd: anchorEnd,
      availableStart: input.availableRangeStart,
      availableEnd: input.availableRangeEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "day30",
      label: "30 Day",
      rangeStart: day30[0]!,
      rangeEnd: anchorEnd,
      availableStart: input.availableRangeStart,
      availableEnd: input.availableRangeEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "ytd",
      label: "YTD",
      rangeStart: ytdStart,
      rangeEnd: anchorEnd,
      availableStart: input.availableRangeStart,
      availableEnd: input.availableRangeEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
    buildRow({
      key: "month12",
      label: "12 Month",
      rangeStart: day365[0]!,
      rangeEnd: anchorEnd,
      availableStart: input.availableRangeStart,
      availableEnd: input.availableRangeEnd,
      cardioCalendarDays: input.cardioCalendarDays,
    }),
  ];

  return { rows };
}
