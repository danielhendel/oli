import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import { filterWorkoutCalendarDaysInclusive } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyDisplayScaleFill01,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandFromAvg,
} from "@/lib/utils/strengthWeeklyFrequencyRating";

export type StrengthHistoryRangeKey = "thisWeek" | "day30" | "day90" | "ytd" | "month12";

export type StrengthHistorySummaryRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

export type StrengthHistorySummaryRow = {
  key: StrengthHistoryRangeKey;
  label: StrengthHistorySummaryRowLabel;
  hasEnoughData: boolean;
  averageSessionsPerWeek: number | null;
  /** Example: `4.4 per week`, or `—` when insufficient. */
  displayValue: string;
  tierLabel: string | null;
  tierIndexForBar: number | null;
  progressFill01: number | null;
  helperText?: string;
};

export type StrengthHistorySummaryModel = {
  rows: readonly StrengthHistorySummaryRow[];
};

export function formatStrengthAvgWorkoutsPerWeekDisplay(avgWorkoutsPerWeek: number): string {
  return `${avgWorkoutsPerWeek.toFixed(1)} per week`;
}

function trailingCalendarDaysThroughToday(todayDayKey: DayKey, dayCount: number): { rangeStart: DayKey; rangeEnd: DayKey } {
  const keys = activityTrailingNDaysInclusive(todayDayKey, dayCount);
  return { rangeStart: keys[0]!, rangeEnd: todayDayKey };
}

function avgSessionsPerWeekFromTotals(totalSessions: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 0;
  return (totalSessions * 7) / elapsedDays;
}

function ratingFieldsFromAvg(avgWorkoutsPerWeek: number): Pick<
  StrengthHistorySummaryRow,
  "tierLabel" | "tierIndexForBar" | "progressFill01"
> {
  const band = strengthWeeklyFrequencyTierBandFromAvg(avgWorkoutsPerWeek);
  return {
    tierLabel: strengthWeeklyFrequencyRatingLabelFromTierBand(band),
    tierIndexForBar: strengthWeeklyFrequencyActivityTierIndexForTierBand(band),
    progressFill01: strengthWeeklyFrequencyDisplayScaleFill01(avgWorkoutsPerWeek),
  };
}

function emptyRow(
  key: StrengthHistoryRangeKey,
  label: StrengthHistorySummaryRowLabel,
  helper?: string,
): StrengthHistorySummaryRow {
  return {
    key,
    label,
    hasEnoughData: false,
    averageSessionsPerWeek: null,
    displayValue: "—",
    tierLabel: null,
    tierIndexForBar: null,
    progressFill01: null,
    ...(helper ? { helperText: helper } : {}),
  };
}

function buildWindowAvgRow(args: {
  key: StrengthHistoryRangeKey;
  label: StrengthHistorySummaryRowLabel;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  availableStart: DayKey;
  availableEnd: DayKey;
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  insufficientHelper?: string;
}): StrengthHistorySummaryRow {
  const covered = args.rangeStart >= args.availableStart && args.rangeEnd <= args.availableEnd;
  if (!covered) {
    return emptyRow(
      args.key,
      args.label,
      args.insufficientHelper ??
        (args.key === "month12" ? "Data will appear when enough history is available" : undefined),
    );
  }

  const sortedDays = [...args.strengthCalendarDays].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const slice = filterWorkoutCalendarDaysInclusive(sortedDays, args.rangeStart, args.rangeEnd);
  const sessions = collectStrengthOverviewTabSessions(slice);
  const daysCount = enumerateDaysInclusive(args.rangeStart, args.rangeEnd).length;
  const avg = avgSessionsPerWeekFromTotals(sessions.length, daysCount);
  return {
    key: args.key,
    label: args.label,
    hasEnoughData: true,
    averageSessionsPerWeek: avg,
    displayValue: formatStrengthAvgWorkoutsPerWeekDisplay(avg),
    ...ratingFieldsFromAvg(avg),
  };
}

/**
 * Strength overview “Baseline” table: average strength-tab sessions per week per time window.
 * **7 Day** = trailing {@link ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT} local days through today (same rolling pattern as 30 Day).
 * 90 Day ends on local yesterday ({@link getActivityOverviewAnchorEndDay}); YTD Jan 1–today; 12 Month = trailing 365 days through today.
 */
export function buildStrengthHistorySummaryModel(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  availableRangeStart: DayKey;
  availableRangeEnd: DayKey;
}): StrengthHistorySummaryModel {
  const { todayDayKey, availableRangeStart: avStart, availableRangeEnd: avEnd } = input;

  const day7 = trailingCalendarDaysThroughToday(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const day30 = trailingCalendarDaysThroughToday(todayDayKey, 30);

  const anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey);
  const day90Keys = activityTrailingNDaysInclusive(anchorYesterday, 90);
  const day90 = { rangeStart: day90Keys[0]!, rangeEnd: anchorYesterday };

  const ytdStart = `${todayDayKey.slice(0, 4)}-01-01` as DayKey;
  const ytd = { rangeStart: ytdStart, rangeEnd: todayDayKey };

  const day365 = trailingCalendarDaysThroughToday(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);

  return {
    rows: [
      buildWindowAvgRow({
        key: "thisWeek",
        label: "7 Day",
        rangeStart: day7.rangeStart,
        rangeEnd: day7.rangeEnd,
        availableStart: avStart,
        availableEnd: avEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildWindowAvgRow({
        key: "day30",
        label: "30 Day",
        rangeStart: day30.rangeStart,
        rangeEnd: day30.rangeEnd,
        availableStart: avStart,
        availableEnd: avEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildWindowAvgRow({
        key: "day90",
        label: "90 Day",
        rangeStart: day90.rangeStart,
        rangeEnd: day90.rangeEnd,
        availableStart: avStart,
        availableEnd: avEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildWindowAvgRow({
        key: "ytd",
        label: "YTD",
        rangeStart: ytd.rangeStart,
        rangeEnd: ytd.rangeEnd,
        availableStart: avStart,
        availableEnd: avEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildWindowAvgRow({
        key: "month12",
        label: "12 Month",
        rangeStart: day365.rangeStart,
        rangeEnd: day365.rangeEnd,
        availableStart: avStart,
        availableEnd: avEnd,
        strengthCalendarDays: input.strengthCalendarDays,
        insufficientHelper: "Data will appear when enough history is available",
      }),
    ],
  };
}
