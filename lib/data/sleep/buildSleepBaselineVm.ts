import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  averageMinutesFromCompletedNights,
  collectCompletedAttributedSleepNights,
} from "@/lib/data/sleep/sleepCompletedNights";
import {
  sleepDurationProgressFill01,
  sleepDurationRatingFromMinutes,
  sleepDurationRatingPillColors,
} from "@/lib/data/sleep/sleepDurationRating";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepBaselineRangeKey = "day7" | "day30" | "day90" | "ytd" | "month12";

export type SleepBaselineRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

export type SleepBaselineRow = {
  key: SleepBaselineRangeKey;
  label: SleepBaselineRowLabel;
  hasEnoughData: boolean;
  averageMinutes: number | null;
  displayValue: string;
  statusLabel: string | null;
  statusColor: string | null;
  statusBackgroundColor: string | null;
  progressFill01: number | null;
};

export type SleepBaselineVm = {
  rows: readonly SleepBaselineRow[];
};

function formatSleepPerNightDisplay(avgMinutes: number): string {
  return `${formatSleepDurationMinutes(avgMinutes)}/night`;
}

function emptyRow(key: SleepBaselineRangeKey, label: SleepBaselineRowLabel): SleepBaselineRow {
  return {
    key,
    label,
    hasEnoughData: false,
    averageMinutes: null,
    displayValue: "—",
    statusLabel: null,
    statusColor: null,
    statusBackgroundColor: null,
    progressFill01: null,
  };
}

function rowFromWindow(input: {
  key: SleepBaselineRangeKey;
  label: SleepBaselineRowLabel;
  calendarDays: readonly DayKey[];
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): SleepBaselineRow {
  const nights = collectCompletedAttributedSleepNights({
    calendarDays: input.calendarDays,
    todayDayKey: input.todayDayKey,
    sleepNightByDay: input.sleepNightByDay,
  });
  const avg = averageMinutesFromCompletedNights(nights);
  if (avg == null) {
    return emptyRow(input.key, input.label);
  }
  const rating = sleepDurationRatingFromMinutes(avg);
  const chrome = sleepDurationRatingPillColors(rating);
  return {
    key: input.key,
    label: input.label,
    hasEnoughData: true,
    averageMinutes: avg,
    displayValue: formatSleepPerNightDisplay(avg),
    statusLabel: rating,
    statusColor: chrome.color,
    statusBackgroundColor: chrome.backgroundColor,
    progressFill01: sleepDurationProgressFill01(avg),
  };
}

/**
 * Sleep Baseline: average nightly duration across key windows.
 * Only completed, attributed sleep nights count; denominator is completed nights only.
 */
export function buildSleepBaselineVm(input: {
  todayDayKey: DayKey;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): SleepBaselineVm {
  const { todayDayKey, sleepNightByDay } = input;
  const anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey);

  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const d30 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
  const d90 = activityTrailingNDaysInclusive(anchorYesterday, 90);
  const ytdDays = activityYtdInclusiveThroughEndDay(todayDayKey);
  const d365 = activityTrailingNDaysInclusive(
    todayDayKey,
    ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  );

  return {
    rows: [
      rowFromWindow({ key: "day7", label: "7 Day", calendarDays: d7, todayDayKey, sleepNightByDay }),
      rowFromWindow({ key: "day30", label: "30 Day", calendarDays: d30, todayDayKey, sleepNightByDay }),
      rowFromWindow({ key: "day90", label: "90 Day", calendarDays: d90, todayDayKey, sleepNightByDay }),
      rowFromWindow({ key: "ytd", label: "YTD", calendarDays: ytdDays, todayDayKey, sleepNightByDay }),
      rowFromWindow({
        key: "month12",
        label: "12 Month",
        calendarDays: d365,
        todayDayKey,
        sleepNightByDay,
      }),
    ],
  };
}
