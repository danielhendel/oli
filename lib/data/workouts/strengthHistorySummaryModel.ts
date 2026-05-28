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
  /**
   * Personalized 1–2 sentence sub-headline for the Strength Baseline card. Mirrors the same
   * pattern shipped on the Activity and Sleep baseline cards: the 90 Day row is the baseline
   * and the 7 Day row is the recent trend vs that baseline. Falls back to a generic but still
   * useful sentence when 90 Day coverage is insufficient. Computed in
   * {@link buildStrengthBaselineExplainerCopy}.
   */
  personalizedExplainer: string;
};

export function formatStrengthAvgWorkoutsPerWeekDisplay(avgWorkoutsPerWeek: number): string {
  return `${avgWorkoutsPerWeek.toFixed(1)} per week`;
}

/**
 * Compact prose form used inside the personalized baseline explainer, e.g. `"3.4/week"`. The
 * row-level `displayValue` (used in the table cell) keeps the existing
 * {@link formatStrengthAvgWorkoutsPerWeekDisplay} format (`"3.4 per week"`).
 */
function formatStrengthSessionsPerWeekWords(avgSessionsPerWeek: number): string {
  return `${avgSessionsPerWeek.toFixed(1)}/week`;
}

/**
 * Fallback explainer used when the 90 Day strength baseline isn't ready yet. Generic but
 * still useful — keeps the same dark-theme typography slot filled and explains what the
 * section will show once history fills in. Exported so tests don't duplicate the literal.
 */
export const STRENGTH_BASELINE_GENERIC_EXPLAINER =
  "Your strength baseline shows your typical sessions per week once 90 days of strength history are available.";

/**
 * Compute the rounded percent difference of `day7Avg` vs the `day90Avg` baseline. Returns
 * `null` when the baseline is unusable (non-finite or ≤ 0) so callers can fall back to
 * baseline-only copy. The sign is preserved (positive = above baseline, negative = below)
 * and the magnitude is rounded to the nearest whole percent for clean display. Mirrors the
 * Activity/Sleep equivalents byte-for-byte.
 */
export function computeStrengthBaselineSevenDayTrendPct(
  day7Avg: number,
  day90Avg: number,
): number | null {
  if (!Number.isFinite(day7Avg) || !Number.isFinite(day90Avg) || day90Avg <= 0) {
    return null;
  }
  const pct = ((day7Avg - day90Avg) / day90Avg) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.round(pct);
}

/**
 * Pure helper — derives the personalized explainer copy from the existing 90 Day baseline
 * row and the 7 Day trailing average. No new data sources.
 *
 * Display rules:
 * - When `day90Row` lacks enough data: returns {@link STRENGTH_BASELINE_GENERIC_EXPLAINER}.
 * - When `day90Row` has data but `day7Row` doesn't: baseline-only sentence.
 * - When both have data: baseline sentence + recent-trend sentence. The trend phrase rounds
 *   to the nearest whole percent and uses "about the same as" when the rounded delta is 0.
 */
export function buildStrengthBaselineExplainerCopy(input: {
  day90Row: StrengthHistorySummaryRow | null;
  day7Row: StrengthHistorySummaryRow | null;
}): string {
  const { day90Row, day7Row } = input;
  if (
    day90Row == null ||
    !day90Row.hasEnoughData ||
    day90Row.averageSessionsPerWeek == null ||
    !Number.isFinite(day90Row.averageSessionsPerWeek)
  ) {
    return STRENGTH_BASELINE_GENERIC_EXPLAINER;
  }

  const day90Avg = day90Row.averageSessionsPerWeek;
  const baselineSentence = `Your 90-day strength baseline is ${formatStrengthSessionsPerWeekWords(day90Avg)}.`;

  if (
    day7Row == null ||
    !day7Row.hasEnoughData ||
    day7Row.averageSessionsPerWeek == null ||
    !Number.isFinite(day7Row.averageSessionsPerWeek)
  ) {
    return baselineSentence;
  }

  const day7Avg = day7Row.averageSessionsPerWeek;
  const pct = computeStrengthBaselineSevenDayTrendPct(day7Avg, day90Avg);
  if (pct == null) return baselineSentence;

  const seven = formatStrengthSessionsPerWeekWords(day7Avg);
  if (pct === 0) {
    return `${baselineSentence} Over the past 7 completed days, you're averaging ${seven} — about the same as your baseline.`;
  }
  const direction = pct > 0 ? "above" : "below";
  const magnitude = Math.abs(pct);
  return `${baselineSentence} Over the past 7 completed days, you're averaging ${seven} — about ${magnitude}% ${direction} your baseline.`;
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

  const rows: readonly StrengthHistorySummaryRow[] = [
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
  ];

  return {
    rows,
    personalizedExplainer: buildStrengthBaselineExplainerCopy({
      day90Row: rows.find((r) => r.key === "day90") ?? null,
      day7Row: rows.find((r) => r.key === "thisWeek") ?? null,
    }),
  };
}
