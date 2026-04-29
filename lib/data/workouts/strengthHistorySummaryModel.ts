import { activityTrailingNDaysInclusive, getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import {
  formatStrengthWeeklyWorkoutsAndMinutes,
  strengthSessionDurationMinutes,
} from "@/lib/data/workouts/strengthSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import {
  strengthWeeklyFrequencyActivityTierIndexForBar,
  strengthWeeklyFrequencyDisplayScaleFill01,
  strengthWeeklyFrequencyRatingBucketFromAvg,
  strengthWeeklyFrequencyRatingLabelFromBucket,
} from "@/lib/utils/strengthWeeklyFrequencyRating";

export type StrengthHistoryRangeKey = "day7" | "day30" | "ytd" | "month12";

export type StrengthHistorySummaryRow = {
  key: StrengthHistoryRangeKey;
  label: "7 Day" | "30 Day" | "YTD" | "12 Month";
  hasEnoughData: boolean;
  totalSessions: number | null;
  averageSessionsPerWeek: number | null;
  totalMinutes: number | null;
  averageMinutesPerWeek: number | null;
  displayValue: string;
  tierLabel: string | null;
  tierIndexForBar: number | null;
  progressFill01: number | null;
  helperText?: string;
};

export type StrengthHistorySummaryModel = {
  rows: readonly StrengthHistorySummaryRow[];
};

function ytdStartFor(anchorEndDay: DayKey): DayKey {
  return `${anchorEndDay.slice(0, 4)}-01-01` as DayKey;
}

function avgPerWeek(total: number, daysCount: number): number {
  if (daysCount <= 0) return 0;
  return (total * 7) / daysCount;
}

function buildRow(args: {
  key: StrengthHistoryRangeKey;
  label: StrengthHistorySummaryRow["label"];
  rangeStart: DayKey;
  rangeEnd: DayKey;
  availableStart: DayKey;
  availableEnd: DayKey;
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
}): StrengthHistorySummaryRow {
  const covered = args.rangeStart >= args.availableStart && args.rangeEnd <= args.availableEnd;
  if (!covered) {
    return {
      key: args.key,
      label: args.label,
      hasEnoughData: false,
      totalSessions: null,
      averageSessionsPerWeek: null,
      totalMinutes: null,
      averageMinutesPerWeek: null,
      displayValue: "—",
      tierLabel: null,
      tierIndexForBar: null,
      progressFill01: null,
      ...(args.key === "month12" ? { helperText: "Data will appear when enough history is available" } : {}),
    };
  }

  const daysInRange = enumerateDaysInclusive(args.rangeStart, args.rangeEnd);
  const daySet = new Set(daysInRange);
  const sessions = collectStrengthOverviewTabSessions(args.strengthCalendarDays.filter((day) => daySet.has(day.day)));
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, session) => {
    const minutes = strengthSessionDurationMinutes(session);
    return sum + (minutes ?? 0);
  }, 0);
  const averageSessionsPerWeek = avgPerWeek(totalSessions, daysInRange.length);
  const averageMinutesPerWeek = avgPerWeek(totalMinutes, daysInRange.length);
  const bucket = strengthWeeklyFrequencyRatingBucketFromAvg(averageSessionsPerWeek);
  return {
    key: args.key,
    label: args.label,
    hasEnoughData: true,
    totalSessions,
    averageSessionsPerWeek,
    totalMinutes,
    averageMinutesPerWeek,
    displayValue: formatStrengthWeeklyWorkoutsAndMinutes({
      averageWorkoutsPerWeek: averageSessionsPerWeek,
      averageMinutesPerWeek,
    }),
    tierLabel: strengthWeeklyFrequencyRatingLabelFromBucket(bucket),
    tierIndexForBar: strengthWeeklyFrequencyActivityTierIndexForBar(bucket),
    progressFill01: strengthWeeklyFrequencyDisplayScaleFill01(averageSessionsPerWeek),
  };
}

export function buildStrengthHistorySummaryModel(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  availableRangeStart: DayKey;
  availableRangeEnd: DayKey;
}): StrengthHistorySummaryModel {
  const anchorEnd = getActivityOverviewAnchorEndDay(input.todayDayKey);
  const day7 = activityTrailingNDaysInclusive(anchorEnd, 7);
  const day30 = activityTrailingNDaysInclusive(anchorEnd, 30);
  const day365 = activityTrailingNDaysInclusive(anchorEnd, 365);
  const ytdStart = ytdStartFor(anchorEnd);

  return {
    rows: [
      buildRow({
        key: "day7",
        label: "7 Day",
        rangeStart: day7[0]!,
        rangeEnd: anchorEnd,
        availableStart: input.availableRangeStart,
        availableEnd: input.availableRangeEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildRow({
        key: "day30",
        label: "30 Day",
        rangeStart: day30[0]!,
        rangeEnd: anchorEnd,
        availableStart: input.availableRangeStart,
        availableEnd: input.availableRangeEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildRow({
        key: "ytd",
        label: "YTD",
        rangeStart: ytdStart,
        rangeEnd: anchorEnd,
        availableStart: input.availableRangeStart,
        availableEnd: input.availableRangeEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
      buildRow({
        key: "month12",
        label: "12 Month",
        rangeStart: day365[0]!,
        rangeEnd: anchorEnd,
        availableStart: input.availableRangeStart,
        availableEnd: input.availableRangeEnd,
        strengthCalendarDays: input.strengthCalendarDays,
      }),
    ],
  };
}
