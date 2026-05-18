import {
  averageMinutesFromCompletedSleepNights,
  collectCompletedSleepNightsForWeek,
  type WeeklyFitnessSleepNightCell,
} from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import { completedSleepMinutesForCalendarDay } from "@/lib/data/sleep/sleepCompletedNights";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Sun→Sat single-letter labels — aligned with Activity weekly chart. */
export const SLEEP_THIS_WEEK_CHART_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type WeeklySleepChartPoint = {
  dayKey: DayKey;
  displayLabel: string;
  /** Sleep minutes for completed attributed night; `0` when missing or future. */
  value: number;
  isFutureDay: boolean;
};

export type WeeklySleepVm = {
  chartPoints: readonly WeeklySleepChartPoint[];
  chartMaxScale: number;
  weeklyAverageText: string | null;
  isEmpty: boolean;
};

export function computeWeeklySleepChartMaxScale(values: readonly number[]): number {
  const peak = Math.max(1, ...values.map((v) => Math.max(0, v)));
  return Math.ceil(peak / 60) * 60;
}

function normalizeWeekKeys(weekDayKeys: readonly DayKey[], anchorDay: DayKey): readonly DayKey[] {
  if (weekDayKeys.length === 7) return weekDayKeys;
  return getWeekDaysForAnchor(anchorDay);
}

export function buildWeeklySleepVm(input: {
  todayDayKey: DayKey;
  weekAnchorDay: DayKey;
  weekDayKeys: readonly DayKey[];
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
}): WeeklySleepVm {
  const weekKeys = normalizeWeekKeys(input.weekDayKeys, input.weekAnchorDay);
  const { todayDayKey, sleepNightByDay } = input;

  const chartPoints: WeeklySleepChartPoint[] = weekKeys.map((dayKey, i) => {
    const label = SLEEP_THIS_WEEK_CHART_DAY_LABELS[i] ?? "—";
    if (dayKey > todayDayKey) {
      return { dayKey, displayLabel: label, value: 0, isFutureDay: true };
    }
    const minutes = completedSleepMinutesForCalendarDay(dayKey, sleepNightByDay[dayKey]);
    return {
      dayKey,
      displayLabel: label,
      value: minutes ?? 0,
      isFutureDay: false,
    };
  });

  const { completedNights } = collectCompletedSleepNightsForWeek({
    weekDayKeys: weekKeys,
    todayDayKey,
    sleepNightByDay,
  });

  const isEmpty = completedNights.length === 0;
  const avgMinutes = isEmpty ? null : averageMinutesFromCompletedSleepNights(completedNights);
  const weeklyAverageText =
    avgMinutes != null && avgMinutes > 0 ? formatSleepDurationMinutes(avgMinutes) : null;

  return {
    chartPoints,
    chartMaxScale: computeWeeklySleepChartMaxScale(chartPoints.map((p) => p.value)),
    weeklyAverageText,
    isEmpty,
  };
}
