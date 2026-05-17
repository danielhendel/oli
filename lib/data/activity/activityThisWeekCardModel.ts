import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

/** Fixed Sun→Sat single-letter labels — matches yearly Activity analytics month-letter density. */
export const ACTIVITY_THIS_WEEK_CHART_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type ActivityThisWeekChartPoint = {
  dayKey: DayKey;
  displayLabel: string;
  /** Rounded step count for the calendar day; `0` when absent, non-numeric, or future day. */
  value: number;
  /** True when `dayKey` is strictly after **calendar** `todayDayKey` (dimmed placeholder). */
  isFutureDay: boolean;
};

/** Embedded StrengthFrequencyMetricCard + weekly steps chart (calendar week, Sun → Sat). */
export type ActivityThisWeekCardModel = {
  compactValuePrimary: string;
  ratingLabel: string;
  activityTierIndexForBar: number;
  fillWidth01Override: number;
  /** Seven points, same order as {@link ACTIVITY_THIS_WEEK_CHART_DAY_LABELS} (Sun → Sat). */
  chartPoints: readonly ActivityThisWeekChartPoint[];
  /** Vertical scale maximum for bar heights (steps). Always ≥ 500 when produced by the builder. */
  chartMaxScale: number;
  /** 90-day baseline mean steps/day when available — chart baseline overlay (same source as Today delta). */
  baselineMeanStepsPerDay: number | null;
  /**
   * Rounded average step count for elapsed week (numeric days only), locale-formatted digits only.
   * e.g. `"8,000"`; null when {@link isEmpty}.
   */
  weeklyAverageMetricValue: string | null;
  isEmpty: boolean;
};

/** Pure helper: safe vertical scale so bar math never divides by zero (mirrors yearly steps chart rounding). */
export function computeActivityThisWeekChartMaxScale(input: {
  baselineMeanSteps: number | null;
  chartPointValues: readonly number[];
}): number {
  const baseline = input.baselineMeanSteps ?? 0;
  const peak = Math.max(1, baseline, ...input.chartPointValues.map((v) => Math.max(0, v)));
  return Math.ceil(peak / 500) * 500;
}

function normalizeWeekDaysSunThroughSat(input: {
  todayDayKey: DayKey;
  weekDayKeys: readonly DayKey[];
}): readonly DayKey[] {
  const { todayDayKey, weekDayKeys } = input;
  if (weekDayKeys.length === 7) return weekDayKeys;
  return getWeekDaysForAnchor(todayDayKey);
}

/**
 * Calendar week containing `todayDayKey`, ordered Sun → Sat.
 * Weekly average pill uses elapsed days through today with numeric rollup only.
 * Chart always emits seven buckets (future days shown as placeholders).
 */
export function buildActivityThisWeekCardModel(input: {
  todayDayKey: DayKey;
  /** Typically {@link getWeekDaysForAnchor}`(todayDayKey)` — seven keys Sun → Sat. */
  weekDayKeys: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
  /** 90-day baseline mean steps/day when available (same source as Today delta). */
  baselineMeanSteps: number | null;
}): ActivityThisWeekCardModel {
  const { todayDayKey, rollupByDay, baselineMeanSteps } = input;

  const weekKeys = normalizeWeekDaysSunThroughSat({
    todayDayKey,
    weekDayKeys: input.weekDayKeys,
  });

  const chartPoints: ActivityThisWeekChartPoint[] = weekKeys.map((dayKey, i) => {
    const label = ACTIVITY_THIS_WEEK_CHART_DAY_LABELS[i] ?? "—";
    if (dayKey > todayDayKey) {
      return { dayKey, displayLabel: label, value: 0, isFutureDay: true };
    }
    const e = rollupByDay[dayKey];
    if (e?.kind !== "numeric") {
      return { dayKey, displayLabel: label, value: 0, isFutureDay: false };
    }
    return { dayKey, displayLabel: label, value: Math.round(e.steps), isFutureDay: false };
  });

  const elapsedKeys = weekKeys.filter((d) => d <= todayDayKey);
  let sum = 0;
  let count = 0;
  for (const d of elapsedKeys) {
    const entry = rollupByDay[d];
    if (entry?.kind === "numeric") {
      sum += entry.steps;
      count += 1;
    }
  }

  const isEmpty = count === 0;
  const weeklyAvg = count > 0 ? sum / count : 0;
  const pill = getStepRatingActivityDescriptorPill(weeklyAvg);
  const tierIdx = getStepRatingTierIndex(weeklyAvg);

  const chartMaxScale = computeActivityThisWeekChartMaxScale({
    baselineMeanSteps: baselineMeanSteps,
    chartPointValues: chartPoints.map((p) => p.value),
  });

  const roundedAvg = Math.round(weeklyAvg);
  const weeklyAverageMetricValue = count > 0 ? roundedAvg.toLocaleString() : null;

  return {
    compactValuePrimary: `${roundedAvg.toLocaleString()} steps/day`,
    ratingLabel: pill.label,
    activityTierIndexForBar: tierIdx,
    fillWidth01Override: activityStepsDisplayScaleFill01(weeklyAvg),
    chartPoints,
    chartMaxScale,
    baselineMeanStepsPerDay: baselineMeanSteps,
    weeklyAverageMetricValue,
    isEmpty,
  };
}
