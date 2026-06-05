/**
 * Pure view-model for the Body "This Week's Weight" card — visual sibling of
 * {@link ActivityThisWeekCard}, but with a **line** series (daily weight points) instead of bars.
 *
 * Contract:
 * - Always emits seven points, Sunday → Saturday, for the selected calendar week.
 * - Each point carries the latest weight reading (by `observedAt`) for that day, or `null` when no
 *   reading exists (missing days are handled gracefully — the line skips them).
 * - Days strictly after `todayDayKey` are flagged `isFutureDay` and always carry `null`.
 * - The weekly summary is the **average of the available daily weights** in the displayed week.
 *
 * Future-week navigation is bounded by {@link computeEnergyWeekNavigationState} (reused, not duplicated).
 * No React, no network.
 */
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import { latestWeightByDay, weightInUnit } from "@/lib/data/body/bodyWeightDailySeries";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Fixed Sun→Sat single-letter labels — matches Activity weekly chart letter density. */
export const BODY_THIS_WEEK_CHART_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type BodyWeeklyWeightChartPoint = {
  dayKey: DayKey;
  displayLabel: string;
  /** Latest weight (kg) for the day; `null` when no reading or a future day. */
  weightKg: number | null;
  /** True when `dayKey` is strictly after `todayDayKey`. */
  isFutureDay: boolean;
};

export type BodyWeeklyWeightCardModel = {
  /** Seven points, Sun → Saturday. */
  chartPoints: readonly BodyWeeklyWeightChartPoint[];
  /** Average of available daily weights (kg) in the week; null when none. */
  weeklyAverageKg: number | null;
  /** Rounded average in the display unit, e.g. `"159.2"`; null when {@link isEmpty}. */
  weeklyAverageMetricValue: string | null;
  /** Count of days with a reading in the displayed week. */
  measuredDayCount: number;
  /** True when no day in the displayed week has a reading. */
  isEmpty: boolean;
};

function normalizeWeekDaysSunThroughSat(input: {
  todayDayKey: DayKey;
  weekDayKeys: readonly DayKey[];
}): readonly DayKey[] {
  if (input.weekDayKeys.length === 7) return input.weekDayKeys;
  return getWeekDaysForAnchor(input.todayDayKey);
}

export function buildBodyWeeklyWeightCardModel(input: {
  todayDayKey: DayKey;
  /** Seven keys Sun → Sat for the displayed week (typically from week navigation). */
  weekDayKeys: readonly DayKey[];
  samples: readonly BodyWeightSample[];
  unit: "kg" | "lb";
}): BodyWeeklyWeightCardModel {
  const { todayDayKey, samples, unit } = input;
  const weekKeys = normalizeWeekDaysSunThroughSat({
    todayDayKey,
    weekDayKeys: input.weekDayKeys,
  });
  const byDay = latestWeightByDay(samples);

  const chartPoints: BodyWeeklyWeightChartPoint[] = weekKeys.map((dayKey, i) => {
    const label = BODY_THIS_WEEK_CHART_DAY_LABELS[i] ?? "\u2014";
    if (dayKey > todayDayKey) {
      return { dayKey, displayLabel: label, weightKg: null, isFutureDay: true };
    }
    const w = byDay.get(dayKey);
    return {
      dayKey,
      displayLabel: label,
      weightKg: w != null && Number.isFinite(w) ? w : null,
      isFutureDay: false,
    };
  });

  const measured = chartPoints.filter((p) => p.weightKg != null);
  const measuredDayCount = measured.length;
  const isEmpty = measuredDayCount === 0;
  const weeklyAverageKg = isEmpty
    ? null
    : measured.reduce((s, p) => s + (p.weightKg ?? 0), 0) / measuredDayCount;
  const weeklyAverageMetricValue =
    weeklyAverageKg != null ? weightInUnit(weeklyAverageKg, unit).toFixed(1) : null;

  return {
    chartPoints,
    weeklyAverageKg,
    weeklyAverageMetricValue,
    measuredDayCount,
    isEmpty,
  };
}
