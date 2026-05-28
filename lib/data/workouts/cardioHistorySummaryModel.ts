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
  /**
   * Personalized 1–2 sentence sub-headline for the Cardio Baseline card. Mirrors the same
   * pattern shipped on the Strength / Activity / Sleep baseline cards: the 90 Day row is the
   * baseline and the 7 Day row is the recent trend vs that baseline. Falls back to a generic
   * but still useful sentence when 90 Day coverage is insufficient. Computed in
   * {@link buildCardioBaselineExplainerCopy}.
   */
  personalizedExplainer: string;
};

/**
 * Fallback explainer used when the 90 Day cardio baseline isn't ready yet. Generic but
 * still useful — keeps the same dark-theme typography slot filled and explains what the
 * section will show once history fills in. Exported so tests don't duplicate the literal.
 */
export const CARDIO_BASELINE_GENERIC_EXPLAINER =
  "Your cardio baseline shows your typical miles per week once 90 days of cardio history are available.";

/** Compact prose form for the explainer (e.g. `"4.2 mi/week"`). */
function formatCardioMilesPerWeekWords(avgMilesPerWeek: number): string {
  return `${avgMilesPerWeek.toFixed(1)} mi/week`;
}

/**
 * Compute the rounded percent difference of `day7Avg` vs the `day90Avg` baseline. Returns
 * `null` when the baseline is unusable (non-finite or ≤ 0). Mirrors the strength/activity/sleep
 * sibling helpers byte-for-byte.
 */
export function computeCardioBaselineSevenDayTrendPct(
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
 */
export function buildCardioBaselineExplainerCopy(input: {
  day90Row: CardioHistorySummaryRow | null;
  day7Row: CardioHistorySummaryRow | null;
}): string {
  const { day90Row, day7Row } = input;
  if (
    day90Row == null ||
    !day90Row.hasEnoughData ||
    day90Row.averageMilesPerWeek == null ||
    !Number.isFinite(day90Row.averageMilesPerWeek) ||
    day90Row.averageMilesPerWeek <= 0
  ) {
    return CARDIO_BASELINE_GENERIC_EXPLAINER;
  }

  const day90Avg = day90Row.averageMilesPerWeek;
  const baselineSentence = `Your 90-day cardio baseline is ${formatCardioMilesPerWeekWords(day90Avg)}.`;

  if (
    day7Row == null ||
    !day7Row.hasEnoughData ||
    day7Row.averageMilesPerWeek == null ||
    !Number.isFinite(day7Row.averageMilesPerWeek)
  ) {
    return baselineSentence;
  }

  const day7Avg = day7Row.averageMilesPerWeek;
  const pct = computeCardioBaselineSevenDayTrendPct(day7Avg, day90Avg);
  if (pct == null) return baselineSentence;

  const seven = formatCardioMilesPerWeekWords(day7Avg);
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

  return {
    rows,
    personalizedExplainer: buildCardioBaselineExplainerCopy({
      day90Row: rows.find((r) => r.key === "day90") ?? null,
      day7Row: rows.find((r) => r.key === "thisWeek") ?? null,
    }),
  };
}
