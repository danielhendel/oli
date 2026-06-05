/**
 * Pure view-model for the Body "{year} Weight" card — visual sibling of {@link ActivityYearlyCard},
 * but rendered as a **line** of monthly average weight instead of bars.
 *
 * Contract:
 * - Always 12 monthly points (January → December) for `selectedYear`.
 * - Each month's value is the mean of that month's **daily-latest** weights (kg); `null` when the
 *   month has no readings (missing months are skipped by the line).
 * - For the current year, months after the current month are flagged `isFutureMonth` (always null).
 * - Future-year navigation is bounded by {@link computeActivityYearNavigationState} (reused).
 * - Primary value = mean of all measured daily weights in the year. Delta = last measured month's
 *   average minus the first measured month's average (vs. start-of-year reading), consistent with
 *   {@link buildBodyWeightBaselineDeltaModel}'s "vs period start" rule.
 *
 * No React, no network.
 */
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import {
  dailyLatestWeightSeries,
  formatSignedWeightDeltaLabel,
  weightInUnit,
} from "@/lib/data/body/bodyWeightDailySeries";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Single-letter month labels — matches Activity yearly chart letter density. */
export const BODY_YEARLY_MONTH_LETTERS = [
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

export type BodyYearlyMonthLabel = (typeof BODY_YEARLY_MONTH_LETTERS)[number];

export type BodyYearlyWeightChartMonth = {
  /** 0–11. */
  monthIndex: number;
  /** `"YYYY-MM"`. */
  monthKey: string;
  label: BodyYearlyMonthLabel;
  /** Mean of daily-latest weights (kg) in the month; null when no readings yet. */
  averageKg: number | null;
  numericDayCount: number;
  isFutureMonth: boolean;
  isCurrentMonth: boolean;
};

export type BodyYearlyWeightCardModel = {
  year: number;
  /** Card title — e.g. `"2026 Weight"`. */
  title: string;
  /** Year nav label — e.g. `"2026"`. */
  rangeLabel: string;
  isCurrentYear: boolean;
  /** True iff at least one month in the year has a reading. */
  hasData: boolean;
  /** Rounded mean of all measured daily weights in the display unit, e.g. `"159.2"`; "" when empty. */
  averageDisplay: string;
  averageUnit: "kg" | "lb";
  /** Signed year-over-year change (last measured month avg − first measured month avg); null when <2 months. */
  deltaLabel: string | null;
  /** Always 12 entries, January → December. */
  months: readonly BodyYearlyWeightChartMonth[];
  isEmpty: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function buildBodyYearlyWeightCardModel(input: {
  selectedYear: number;
  todayDayKey: DayKey;
  samples: readonly BodyWeightSample[];
  unit: "kg" | "lb";
}): BodyYearlyWeightCardModel {
  const { selectedYear, todayDayKey, samples, unit } = input;
  const currentYear = Number.parseInt(todayDayKey.slice(0, 4), 10);
  const currentMonthIndex = Number.parseInt(todayDayKey.slice(5, 7), 10) - 1;
  const isCurrentYear = selectedYear === currentYear;
  const todayMonthKey = todayDayKey.slice(0, 7);

  const series = dailyLatestWeightSeries(samples);

  const months: BodyYearlyWeightChartMonth[] = [];
  let yearSum = 0;
  let yearCount = 0;

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthKey = `${selectedYear}-${pad2(monthIndex + 1)}`;
    const isFutureMonth = isCurrentYear
      ? monthIndex > currentMonthIndex
      : selectedYear > currentYear;
    const isCurrentMonth = monthKey === todayMonthKey;

    if (isFutureMonth) {
      months.push({
        monthIndex,
        monthKey,
        label: BODY_YEARLY_MONTH_LETTERS[monthIndex]!,
        averageKg: null,
        numericDayCount: 0,
        isFutureMonth: true,
        isCurrentMonth: false,
      });
      continue;
    }

    const monthDays = series.filter((d) => d.dayKey.slice(0, 7) === monthKey);
    const numericDayCount = monthDays.length;
    const monthSum = monthDays.reduce((s, d) => s + d.weightKg, 0);
    const averageKg = numericDayCount > 0 ? monthSum / numericDayCount : null;

    yearSum += monthSum;
    yearCount += numericDayCount;

    months.push({
      monthIndex,
      monthKey,
      label: BODY_YEARLY_MONTH_LETTERS[monthIndex]!,
      averageKg,
      numericDayCount,
      isFutureMonth: false,
      isCurrentMonth,
    });
  }

  const hasData = yearCount > 0;
  const averageDisplay = hasData
    ? weightInUnit(yearSum / yearCount, unit).toFixed(1)
    : "";

  const measuredMonths = months.filter((m) => m.averageKg != null);
  const deltaLabel =
    measuredMonths.length >= 2
      ? formatSignedWeightDeltaLabel(
          measuredMonths[measuredMonths.length - 1]!.averageKg! - measuredMonths[0]!.averageKg!,
          unit,
        )
      : null;

  return {
    year: selectedYear,
    title: `${selectedYear} Weight`,
    rangeLabel: String(selectedYear),
    isCurrentYear,
    hasData,
    averageDisplay,
    averageUnit: unit,
    deltaLabel,
    months,
    isEmpty: !hasData,
  };
}
