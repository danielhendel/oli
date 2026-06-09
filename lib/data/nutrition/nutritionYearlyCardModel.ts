import type { CanonicalEventListItem } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import { avgKcalPerDayInWindow } from "@/lib/data/nutrition/nutritionFactsAggregate";
import type { NutritionDailyFactsByDay } from "@/lib/data/nutrition/useNutritionDailyFactsRollup";

export const NUTRITION_YEARLY_MONTH_LETTERS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
] as const;

export type NutritionYearlyMonthLabel = (typeof NUTRITION_YEARLY_MONTH_LETTERS)[number];

export type NutritionYearlyChartMonth = {
  monthIndex: number;
  monthKey: string;
  label: NutritionYearlyMonthLabel;
  daysLogged: number;
  avgKcal: number | null;
  isFutureMonth: boolean;
  isCurrentMonth: boolean;
};

export type NutritionYearlyCardModel = {
  year: number;
  title: string;
  rangeLabel: string;
  isCurrentYear: boolean;
  hasData: boolean;
  totalDaysLogged: number;
  totalDisplay: string;
  totalQualifier: "days logged";
  months: readonly NutritionYearlyChartMonth[];
  chartMaxScale: number;
  todayMonthKey: string;
  isEmpty: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ceilToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return step;
  return Math.ceil(value / step) * step;
}

export function countNutritionLoggedDaysByMonthFromEvents(
  events: readonly CanonicalEventListItem[],
  year: number,
): Readonly<Record<string, number>> {
  const yearPrefix = `${year}-`;
  const counts: Record<string, number> = {};
  const daysByMonth: Record<string, Set<string>> = {};

  for (const e of events) {
    if (e.kind !== "nutrition") continue;
    if (!e.day.startsWith(yearPrefix)) continue;
    const mk = e.day.slice(0, 7);
    if (!daysByMonth[mk]) daysByMonth[mk] = new Set();
    daysByMonth[mk].add(e.day);
  }

  for (const [mk, days] of Object.entries(daysByMonth)) {
    counts[mk] = days.size;
  }
  return counts;
}

export function buildNutritionYearlyCardModel(input: {
  selectedYear: number;
  todayDayKey: DayKey;
  monthlyDayCounts: Readonly<Record<string, number>>;
  byDay: NutritionDailyFactsByDay;
}): NutritionYearlyCardModel {
  const { selectedYear, todayDayKey, monthlyDayCounts } = input;
  const todayYear = Number.parseInt(todayDayKey.slice(0, 4), 10);
  const todayMonthIndex = Number.parseInt(todayDayKey.slice(5, 7), 10) - 1;
  const todayMonthKey = todayDayKey.slice(0, 7);
  const isCurrentYear = selectedYear === todayYear;

  let totalDaysLogged = 0;
  const months: NutritionYearlyChartMonth[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthKey = `${selectedYear}-${pad2(monthIndex + 1)}`;
    const isFutureMonth = isCurrentYear
      ? monthIndex > todayMonthIndex
      : selectedYear > todayYear;
    const isCurrentMonth = isCurrentYear && monthIndex === todayMonthIndex;
    const daysLogged = isFutureMonth ? 0 : Math.max(0, monthlyDayCounts[monthKey] ?? 0);
    totalDaysLogged += daysLogged;

    const monthStart = `${monthKey}-01` as DayKey;
    const monthEnd = isCurrentMonth
      ? todayDayKey
      : (`${monthKey}-${pad2(new Date(selectedYear, monthIndex + 1, 0).getDate())}` as DayKey);
    const avgKcal = isFutureMonth ? null : avgKcalPerDayInWindow(input.byDay, monthStart, monthEnd);

    months.push({
      monthIndex,
      monthKey,
      label: NUTRITION_YEARLY_MONTH_LETTERS[monthIndex]!,
      daysLogged,
      avgKcal,
      isFutureMonth,
      isCurrentMonth,
    });
  }

  const hasData = totalDaysLogged > 0;
  const peakMonthly = months.reduce<number>((acc, m) => (m.daysLogged > acc ? m.daysLogged : acc), 0);
  const chartMaxScale = ceilToStep(peakMonthly, 5);

  return {
    year: selectedYear,
    title: `${selectedYear} Nutrition`,
    rangeLabel: String(selectedYear),
    isCurrentYear,
    hasData,
    totalDaysLogged,
    totalDisplay: totalDaysLogged.toLocaleString(),
    totalQualifier: "days logged",
    months,
    chartMaxScale,
    todayMonthKey,
    isEmpty: !hasData,
  };
}
