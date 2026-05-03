/**
 * Monthly average daily steps for Activity Analytics yearly chart (presentation-only).
 *
 * Denominator: **days with numeric rollup in that month** (not calendar days) so incomplete
 * Apple Health coverage does not deflate averages with implicit zeros.
 */

import {
  buildActivityBaselineCardModel,
  parseActivityDailyDetailsNumericSteps,
} from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  activityTrailingNDaysInclusive,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import type { YearWorkloadPoint } from "@/lib/ui/workouts/StrengthYearlyWorkloadBars";

export const ACTIVITY_ANALYTICS_CHART_YEAR = WORKOUT_OVERVIEW_ANALYTICS_YEAR;

const CHART_MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

function monthLetter(monthIndex1Based: number): string {
  if (monthIndex1Based < 1 || monthIndex1Based > 12) return "—";
  return CHART_MONTH_LETTERS[monthIndex1Based - 1] ?? "—";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Inclusive day keys for `year`–`month` (1–12) that are on/before `todayDayKey` when in the same calendar year. */
function dayKeysInMonthThroughToday(year: number, month: number, todayDayKey: DayKey): DayKey[] {
  const y = String(year);
  const m = pad2(month);
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${y}-${m}-01` as DayKey;
  const last = `${y}-${m}-${pad2(lastDay)}` as DayKey;
  const cap = todayDayKey.slice(0, 4) === y ? todayDayKey : last;
  const end = last < cap ? last : cap;
  if (start > end) return [];
  return enumerateDaysInclusive(start, end);
}

export type ActivityMonthlyStepsAnalyticsModel = {
  chartYear: typeof ACTIVITY_ANALYTICS_CHART_YEAR;
  /** e.g. `"2026 Steps"` */
  headerTitle: string;
  points: YearWorkloadPoint[];
  todayMonthKey: string;
  /** 90-day activity baseline mean steps/day when computable; drives chart baseline line. */
  baselineMeanStepsPerDay: number | null;
  /** Vertical scale max for bars (same units as {@link YearWorkloadPoint.value}). */
  maxScale: number;
};

/**
 * Builds 12 month keys for {@link ACTIVITY_ANALYTICS_CHART_YEAR} with average steps/day from numeric rollups only.
 */
export function buildActivityMonthlyStepsAnalyticsModel(input: {
  rollupByDay: Readonly<ActivityStepsRollupMap>;
  todayDayKey: DayKey;
  /** When baseline cannot be computed from `baselineRollupByDay`, baseline line is omitted (null). */
  baselineRollupByDay: Readonly<ActivityStepsRollupMap>;
  overviewAnchorEndDay: DayKey;
}): ActivityMonthlyStepsAnalyticsModel {
  const { rollupByDay, todayDayKey, baselineRollupByDay, overviewAnchorEndDay } = input;
  const chartYear = ACTIVITY_ANALYTICS_CHART_YEAR;
  const todayMonthKey = todayDayKey.slice(0, 7);

  const baselineModel = buildActivityBaselineCardModel({
    overviewAnchorEndDay,
    rollupByDay: baselineRollupByDay,
  });
  const baselineMeanStepsPerDay =
    baselineModel.compactStatsSummary.trim() !== ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA
      ? parseActivityDailyDetailsNumericSteps(baselineModel.compactStatsSummary)
      : null;

  const points: YearWorkloadPoint[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const monthKey = `${chartYear}-${pad2(month)}`;
    const dayKeys = dayKeysInMonthThroughToday(chartYear, month, todayDayKey);
    let sum = 0;
    let count = 0;
    for (const dk of dayKeys) {
      const e = rollupByDay[dk];
      if (e?.kind === "numeric") {
        sum += e.steps;
        count += 1;
      }
    }
    const avg = count > 0 ? sum / count : 0;
    const rounded = Math.round(avg);
    points.push({
      monthKey,
      displayLabel: monthLetter(month),
      value: rounded,
    });
  }

  const baselineForScale = baselineMeanStepsPerDay ?? 0;
  const peak = Math.max(1, baselineForScale, ...points.map((p) => p.value));
  const maxScale = Math.ceil(peak / 500) * 500;

  return {
    chartYear,
    headerTitle: `${chartYear} Steps`,
    points,
    todayMonthKey,
    baselineMeanStepsPerDay,
    maxScale,
  };
}

/** Keys to hydrate yearly chart + 90-day baseline line without HK merge in baseline path. */
export function computeActivityAnalyticsRollupFetchDayKeys(todayDayKey: DayKey): DayKey[] {
  const year = ACTIVITY_ANALYTICS_CHART_YEAR;
  const yStart = `${year}-01-01` as DayKey;
  const yEnd = `${year}-12-31` as DayKey;
  const yearRange = enumerateDaysInclusive(yStart, yEnd);
  const anchor = getActivityOverviewAnchorEndDay(todayDayKey);
  const trail90 = activityTrailingNDaysInclusive(anchor, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
  const set = new Set<DayKey>([...yearRange, ...trail90, todayDayKey]);
  return [...set].sort();
}
