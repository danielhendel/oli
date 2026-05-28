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
  /**
   * Personalized baseline copy derived from the 90 Day row (baseline + status category) and the
   * 7 Day row (recent trend vs that baseline). Falls back to a generic but useful sentence when
   * 90 Day coverage is insufficient. Mirrors Activity's `buildActivityBaselineExplainerCopy` so
   * the two pages stay visually + linguistically aligned.
   */
  personalizedExplainer: string;
};

/**
 * Fallback explainer when the 90-day baseline isn't ready yet. Generic but useful — explains
 * what the section will show once enough history exists. Exported for tests so the literal
 * isn't duplicated.
 */
export const SLEEP_BASELINE_GENERIC_EXPLAINER =
  "Your sleep baseline shows your typical nightly sleep once 90 completed nights of history are available.";

function formatSleepPerNightWords(avgMinutes: number): string {
  return `${formatSleepDurationMinutes(avgMinutes)}/night`;
}

/**
 * Rounded percent difference of `day7Avg` vs the `day90Avg` baseline. Returns `null` when the
 * baseline is unusable (non-finite or ≤ 0) so callers can fall back to baseline-only copy.
 * Sign is preserved (positive = above baseline).
 */
export function computeSleepBaselineSevenNightTrendPct(
  day7Avg: number,
  day90Avg: number,
): number | null {
  if (
    !Number.isFinite(day7Avg) ||
    !Number.isFinite(day90Avg) ||
    day90Avg <= 0
  ) {
    return null;
  }
  const pct = ((day7Avg - day90Avg) / day90Avg) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.round(pct);
}

/**
 * Derives the personalized Sleep Baseline explainer copy from the 90 Day row (baseline figure +
 * status category) and the 7 Day row (recent trend vs that baseline). Uses the same Sleep
 * duration tier names ("Optimal" / "Good" / "Fair" / "Low") as the rest of Sleep surfaces.
 *
 * Display rules (mirror of Activity):
 * - When `day90Row` lacks data → {@link SLEEP_BASELINE_GENERIC_EXPLAINER}.
 * - When `day90Row` has data but `day7Row` doesn't → baseline-only sentence.
 * - When both have data → baseline sentence + recent-trend sentence (rounds to whole percent;
 *   uses "about the same as" when rounded delta is 0).
 */
export function buildSleepBaselineExplainerCopy(input: {
  day90Row: SleepBaselineRow | null;
  day7Row: SleepBaselineRow | null;
}): string {
  const { day90Row, day7Row } = input;
  if (
    day90Row == null ||
    !day90Row.hasEnoughData ||
    day90Row.averageMinutes == null ||
    !Number.isFinite(day90Row.averageMinutes)
  ) {
    return SLEEP_BASELINE_GENERIC_EXPLAINER;
  }

  const day90Avg = day90Row.averageMinutes;
  const category = day90Row.statusLabel ?? sleepDurationRatingFromMinutes(day90Avg);
  const baselineSentence = `Your 90-day sleep baseline is ${formatSleepPerNightWords(day90Avg)}, which puts you in the ${category} range.`;

  if (
    day7Row == null ||
    !day7Row.hasEnoughData ||
    day7Row.averageMinutes == null ||
    !Number.isFinite(day7Row.averageMinutes)
  ) {
    return baselineSentence;
  }

  const day7Avg = day7Row.averageMinutes;
  const pct = computeSleepBaselineSevenNightTrendPct(day7Avg, day90Avg);
  if (pct == null) return baselineSentence;

  const seven = formatSleepPerNightWords(day7Avg);
  if (pct === 0) {
    return `${baselineSentence} Over the past 7 completed nights, you're averaging ${seven} — about the same as your baseline.`;
  }
  const direction = pct > 0 ? "above" : "below";
  const magnitude = Math.abs(pct);
  return `${baselineSentence} Over the past 7 completed nights, you're averaging ${seven} — about ${magnitude}% ${direction} your baseline.`;
}

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

  const rows: readonly SleepBaselineRow[] = [
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
  ];

  return {
    rows,
    personalizedExplainer: buildSleepBaselineExplainerCopy({
      day90Row: rows.find((r) => r.key === "day90") ?? null,
      day7Row: rows.find((r) => r.key === "day7") ?? null,
    }),
  };
}
