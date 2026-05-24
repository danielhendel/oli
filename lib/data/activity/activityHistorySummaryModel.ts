import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  meanNumericStepsForWindow,
  meanStepsPerDayZeroFilled,
  stepsWindowHasAnyErrorDay,
  stepsWindowHasFullNumericCoverage,
} from "@/lib/data/activity/activityOverviewSufficiency";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

export type ActivityHistoryRangeKey = "day7" | "day30" | "day90" | "ytd" | "month12";

export type ActivityHistorySummaryRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

export type ActivityHistorySummaryRow = {
  key: ActivityHistoryRangeKey;
  label: ActivityHistorySummaryRowLabel;
  hasEnoughData: boolean;
  averageStepsPerDay: number | null;
  displayValue: string;
  tierLabel: string | null;
  tierIndexForBar: number | null;
  progressFill01: number | null;
  helperText?: string;
};

export type ActivityHistorySummaryModel = {
  rows: readonly ActivityHistorySummaryRow[];
  /**
   * Personalized baseline explainer copy derived from the 90 Day row (baseline figure + category) and
   * the 7 Day row (recent trend vs that baseline). Falls back to a generic but still useful sentence
   * when 90 Day coverage is insufficient. Computed in {@link buildActivityBaselineExplainerCopy}.
   */
  personalizedExplainer: string;
};

export function formatActivityStepsPerDayDisplay(avgStepsPerDay: number): string {
  return `${Math.round(avgStepsPerDay).toLocaleString()} steps/day`;
}

function ratingFieldsFromAvgSteps(avgStepsPerDay: number): Pick<
  ActivityHistorySummaryRow,
  "tierLabel" | "tierIndexForBar" | "progressFill01"
> {
  const pill = getStepRatingActivityDescriptorPill(avgStepsPerDay);
  const tierIndex = getStepRatingTierIndex(avgStepsPerDay);
  return {
    tierLabel: pill.label,
    tierIndexForBar: tierIndex,
    progressFill01: activityStepsDisplayScaleFill01(avgStepsPerDay),
  };
}

function emptyRow(
  key: ActivityHistoryRangeKey,
  label: ActivityHistorySummaryRowLabel,
  helper?: string,
): ActivityHistorySummaryRow {
  return {
    key,
    label,
    hasEnoughData: false,
    averageStepsPerDay: null,
    displayValue: "—",
    tierLabel: null,
    tierIndexForBar: null,
    progressFill01: null,
    ...(helper ? { helperText: helper } : {}),
  };
}

function rowFullCoverageWindow(input: {
  key: ActivityHistoryRangeKey;
  label: ActivityHistorySummaryRowLabel;
  days: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityHistorySummaryRow {
  const sufficient = stepsWindowHasFullNumericCoverage(input.days, input.rollupByDay);
  if (!sufficient) {
    return emptyRow(input.key, input.label);
  }
  const avg = meanNumericStepsForWindow(input.days, input.rollupByDay);
  return {
    key: input.key,
    label: input.label,
    hasEnoughData: true,
    averageStepsPerDay: avg,
    displayValue: formatActivityStepsPerDayDisplay(avg),
    ...ratingFieldsFromAvgSteps(avg),
  };
}

function rowZeroFilledWindow(input: {
  key: ActivityHistoryRangeKey;
  label: ActivityHistorySummaryRowLabel;
  days: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
  insufficientHelper?: string;
}): ActivityHistorySummaryRow {
  if (stepsWindowHasAnyErrorDay(input.days, input.rollupByDay)) {
    return emptyRow(
      input.key,
      input.label,
      input.key === "month12"
        ? input.insufficientHelper ?? "Data will appear when enough history is available"
        : undefined,
    );
  }
  const avg = meanStepsPerDayZeroFilled(input.days, input.rollupByDay);
  return {
    key: input.key,
    label: input.label,
    hasEnoughData: true,
    averageStepsPerDay: avg,
    displayValue: formatActivityStepsPerDayDisplay(avg),
    ...ratingFieldsFromAvgSteps(avg),
  };
}

/**
 * Activity overview "Baseline" table: average daily steps per rolling/calendar window.
 *
 * Anchor contract — **every** window ends at the **last completed day**
 * (`anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey)`), never at device today. Today
 * is intentionally excluded from all rows so a partial in-progress step total cannot drag the
 * baselines down (or push them up). When `todayDayKey = 2026-05-24`:
 *   - 7 Day   = 2026-05-17 … 2026-05-23 (inclusive)
 *   - 30 Day  ends 2026-05-23
 *   - 90 Day  ends 2026-05-23
 *   - YTD     = 2026-01-01 … 2026-05-23 (Jan 1 of `anchorYesterday`'s year through anchor)
 *   - 12 Month = 365 days ending 2026-05-23
 */
export function buildActivityHistorySummaryModel(input: {
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityHistorySummaryModel {
  const { todayDayKey, rollupByDay } = input;
  const anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey);

  const d7 = activityTrailingNDaysInclusive(anchorYesterday, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const d30 = activityTrailingNDaysInclusive(anchorYesterday, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
  const d90 = activityTrailingNDaysInclusive(anchorYesterday, 90);
  const ytdDays = activityYtdInclusiveThroughEndDay(anchorYesterday);
  const d365 = activityTrailingNDaysInclusive(
    anchorYesterday,
    ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  );

  const rows: readonly ActivityHistorySummaryRow[] = [
    rowFullCoverageWindow({ key: "day7", label: "7 Day", days: d7, rollupByDay }),
    rowFullCoverageWindow({ key: "day30", label: "30 Day", days: d30, rollupByDay }),
    rowFullCoverageWindow({ key: "day90", label: "90 Day", days: d90, rollupByDay }),
    rowZeroFilledWindow({ key: "ytd", label: "YTD", days: ytdDays, rollupByDay }),
    rowZeroFilledWindow({
      key: "month12",
      label: "12 Month",
      days: d365,
      rollupByDay,
      insufficientHelper: "Data will appear when enough history is available",
    }),
  ];

  return {
    rows,
    personalizedExplainer: buildActivityBaselineExplainerCopy({
      day90Row: rows.find((r) => r.key === "day90") ?? null,
      day7Row: rows.find((r) => r.key === "day7") ?? null,
    }),
  };
}

/**
 * Fallback explainer used when the 90-day baseline isn't ready yet. Generic but still useful — keeps
 * the same dark-theme typography slot filled and explains what the section will show once history fills
 * in. Exported for tests so the literal isn't duplicated.
 */
export const ACTIVITY_BASELINE_GENERIC_EXPLAINER =
  "Your activity baseline shows your typical daily steps once 90 completed days of history are available.";

function formatStepsPerDayWords(avgStepsPerDay: number): string {
  return `${Math.round(avgStepsPerDay).toLocaleString()} steps/day`;
}

/**
 * Compute the rounded percent difference of `day7Avg` vs the `day90Avg` baseline. Returns `null`
 * when the baseline is unusable (non-finite or ≤ 0) so callers can fall back to baseline-only copy.
 * The sign is preserved (positive = above baseline, negative = below) and the magnitude is rounded
 * to the nearest whole percent for clean display.
 */
export function computeActivityBaselineSevenDayTrendPct(
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
 * Pure helper — derives the personalized explainer copy from the existing 90 Day baseline figure
 * (with its activity category) and the 7 Day trailing average. No new data sources; uses the same
 * tier descriptor (`Sedentary` / `Lightly Active` / `Moderately Active` / `Active` / `Very Active`
 * / `Highly Active`) the rest of Activity surfaces use.
 *
 * Display rules:
 * - When `day90Row` lacks enough data: returns {@link ACTIVITY_BASELINE_GENERIC_EXPLAINER}.
 * - When `day90Row` has data but `day7Row` doesn't: baseline-only sentence.
 * - When both have data: baseline sentence + recent-trend sentence. The trend phrase rounds to
 *   the nearest whole percent and uses "about the same as" when the rounded delta is 0.
 */
export function buildActivityBaselineExplainerCopy(input: {
  day90Row: ActivityHistorySummaryRow | null;
  day7Row: ActivityHistorySummaryRow | null;
}): string {
  const { day90Row, day7Row } = input;
  if (
    day90Row == null ||
    !day90Row.hasEnoughData ||
    day90Row.averageStepsPerDay == null ||
    !Number.isFinite(day90Row.averageStepsPerDay)
  ) {
    return ACTIVITY_BASELINE_GENERIC_EXPLAINER;
  }

  const day90Avg = day90Row.averageStepsPerDay;
  const category = getStepRatingActivityDescriptorPill(day90Avg).label;
  const baselineSentence = `Your 90-day baseline is ${formatStepsPerDayWords(day90Avg)}, which puts you in the ${category} range.`;

  if (
    day7Row == null ||
    !day7Row.hasEnoughData ||
    day7Row.averageStepsPerDay == null ||
    !Number.isFinite(day7Row.averageStepsPerDay)
  ) {
    return baselineSentence;
  }

  const day7Avg = day7Row.averageStepsPerDay;
  const pct = computeActivityBaselineSevenDayTrendPct(day7Avg, day90Avg);
  if (pct == null) {
    return baselineSentence;
  }

  const seven = formatStepsPerDayWords(day7Avg);
  if (pct === 0) {
    return `${baselineSentence} Over the past 7 completed days, you're averaging ${seven} — about the same as your baseline.`;
  }
  const direction = pct > 0 ? "above" : "below";
  const magnitude = Math.abs(pct);
  return `${baselineSentence} Over the past 7 completed days, you're averaging ${seven} — about ${magnitude}% ${direction} your baseline.`;
}
