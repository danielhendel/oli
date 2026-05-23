import { SLEEP_THIS_WEEK_CHART_DAY_LABELS } from "@/lib/data/sleep/buildWeeklySleepVm";
import type { WeeklyDailyEnergyCell } from "@/lib/data/dash/useWeeklyDailyEnergyMap";
import { formatEnergyRange } from "@/lib/ui/energy/energyPresentation";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WeeklyEnergyChartPoint = {
  dayKey: DayKey;
  displayLabel: string;
  low: number | null;
  high: number | null;
  isFutureDay: boolean;
};

export type WeeklyEnergyVm = {
  chartPoints: readonly WeeklyEnergyChartPoint[];
  chartMin: number;
  chartMax: number;
  weeklyAverageRangeText: string | null;
  weeklyAverageQualifier: string;
  isEmpty: boolean;
};

export const WEEKLY_AVG_ENERGY_QUALIFIER = "avg / day";

function normalizeWeekKeys(weekDayKeys: readonly DayKey[], anchorDay: DayKey): readonly DayKey[] {
  if (weekDayKeys.length === 7) return weekDayKeys;
  return getWeekDaysForAnchor(anchorDay);
}

function pickDayRange(cell: WeeklyDailyEnergyCell | undefined): { low: number; high: number } | null {
  const est = cell?.energy?.estimatedKcal;
  if (est == null) return null;
  const low = est.low;
  const high = est.high;
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= 0) return null;
  return { low: Math.max(0, low), high: Math.max(low, high) };
}

export function computeWeeklyEnergyChartScale(
  points: readonly Pick<WeeklyEnergyChartPoint, "low" | "high">[],
): { chartMin: number; chartMax: number } {
  const lows: number[] = [];
  const highs: number[] = [];
  for (const p of points) {
    if (p.low == null || p.high == null) continue;
    lows.push(p.low);
    highs.push(p.high);
  }
  if (lows.length === 0) {
    return { chartMin: 0, chartMax: 3000 };
  }
  const rawMin = Math.min(...lows);
  const rawMax = Math.max(...highs, rawMin + 1);
  const chartMin = Math.max(0, Math.floor(rawMin / 100) * 100);
  const chartMax = Math.max(chartMin + 200, Math.ceil(rawMax / 100) * 100);
  return { chartMin, chartMax };
}

export function buildWeeklyEnergyVm(input: {
  todayDayKey: DayKey;
  weekAnchorDay: DayKey;
  weekDayKeys: readonly DayKey[];
  energyByDay: Readonly<Partial<Record<DayKey, WeeklyDailyEnergyCell>>>;
}): WeeklyEnergyVm {
  const weekKeys = normalizeWeekKeys(input.weekDayKeys, input.weekAnchorDay);
  const { todayDayKey, energyByDay } = input;

  const chartPoints: WeeklyEnergyChartPoint[] = weekKeys.map((dayKey, i) => {
    const label = SLEEP_THIS_WEEK_CHART_DAY_LABELS[i] ?? "—";
    if (dayKey > todayDayKey) {
      return { dayKey, displayLabel: label, low: null, high: null, isFutureDay: true };
    }
    const range = pickDayRange(energyByDay[dayKey]);
    if (range == null) {
      return { dayKey, displayLabel: label, low: null, high: null, isFutureDay: false };
    }
    return {
      dayKey,
      displayLabel: label,
      low: range.low,
      high: range.high,
      isFutureDay: false,
    };
  });

  const presentRanges = chartPoints
    .filter((p) => !p.isFutureDay && p.low != null && p.high != null)
    .map((p) => ({ low: p.low!, high: p.high! }));

  const isEmpty = presentRanges.length === 0;

  let weeklyAverageRangeText: string | null = null;
  if (!isEmpty) {
    const avgLow = presentRanges.reduce((s, r) => s + r.low, 0) / presentRanges.length;
    const avgHigh = presentRanges.reduce((s, r) => s + r.high, 0) / presentRanges.length;
    weeklyAverageRangeText = formatEnergyRange(avgLow, avgHigh);
  }

  const { chartMin, chartMax } = computeWeeklyEnergyChartScale(chartPoints);

  return {
    chartPoints,
    chartMin,
    chartMax,
    weeklyAverageRangeText,
    weeklyAverageQualifier: WEEKLY_AVG_ENERGY_QUALIFIER,
    isEmpty,
  };
}
