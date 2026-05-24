/**
 * Yearly Activity card — pure presentation model for the Activity overview screen.
 *
 * Contract:
 * - **Today is always excluded.** All aggregations end at
 *   `getActivityOverviewAnchorEndDay(todayDayKey)` (= local yesterday), matching the Activity
 *   Baseline rows so the yearly view shares the "completed days only" semantics.
 * - **Numerator / denominator policy.** A day contributes iff its rollup entry is `kind: "numeric"`.
 *   The denominator is the **count of numeric days** in the window, not the count of calendar days;
 *   this mirrors {@link buildActivityMonthlyStepsAnalyticsModel} so partial Apple Health coverage
 *   does not deflate averages via implicit zeros.
 * - The same rule is applied to both the hero "avg steps per day" figure and the 12 monthly bars.
 *
 * Pure: no React, no network. Caller is responsible for hydrating `rollupByDay` with the keys
 * returned by {@link computeActivityYearlyCardFetchDayKeys}.
 */

import { getActivityOverviewAnchorEndDay } from "@/lib/data/activity/activityOverviewRanges";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Single-letter month labels — matches the existing Activity weekly chart letter density. */
export const ACTIVITY_YEARLY_MONTH_LETTERS = [
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

export type ActivityYearlyMonthLabel = (typeof ACTIVITY_YEARLY_MONTH_LETTERS)[number];

export type ActivityYearlyChartMonth = {
  /** 0–11. */
  monthIndex: number;
  /** `"YYYY-MM"`. */
  monthKey: string;
  /** Single-letter label, e.g. `"J"` / `"F"` / `"M"`. */
  label: ActivityYearlyMonthLabel;
  /**
   * Rounded mean step count across days in this month with `kind === "numeric"` (capped at the
   * anchor day). `null` when the month has no numeric days yet — keeps "0" out of the chart for
   * months that simply haven't been recorded.
   */
  averageSteps: number | null;
  /** Number of numeric-day rollups summed into {@link averageSteps}. */
  numericDayCount: number;
  /** True when every day of the month is **after** the anchor (yesterday). */
  isFutureMonth: boolean;
  /** True when the month contains the anchor day. */
  isCurrentMonth: boolean;
};

export type ActivityYearlyCardModel = {
  /** 4-digit calendar year for the card. */
  year: number;
  /** Card title — e.g. `"2026 Activity"`. */
  title: string;
  /** Year nav label — e.g. `"2026"`. */
  rangeLabel: string;
  /** True when `year` matches the year of `todayDayKey`. */
  isCurrentYear: boolean;
  /**
   * True iff at least one day in `year` (≤ anchor) has a numeric rollup. Cards driven from
   * {@link useActivityOverviewScreenData} use the **current-year** value of this flag to decide
   * whether to mount the Yearly card at all; once mounted, the card is free to render an empty
   * state for navigated past years without losing the year nav.
   */
  hasData: boolean;
  /** Rounded mean steps/day across numeric days in the displayed year (≤ anchor). 0 when empty. */
  averageStepsPerDay: number;
  /** Locale-formatted hero figure (e.g. `"12,345"`). Empty string when {@link isEmpty}. */
  averageDisplay: string;
  /** Static qualifier paired with {@link averageDisplay}. */
  averageQualifier: "avg steps per day";
  /** Always 12 entries, January → December. */
  months: readonly ActivityYearlyChartMonth[];
  /** Vertical scale max for bars (steps), aligned with the same "round up to 500" rule used by ThisWeek. */
  chartMaxScale: number;
  /** `"YYYY-MM"` for the anchor day (yesterday). Used by the bars to emphasize the current month. */
  todayMonthKey: string;
  /** Convenience for the card's empty state branch. */
  isEmpty: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKeysForMonthWithinYear(year: number, month1Based: number): DayKey[] {
  const y = String(year);
  const m = pad2(month1Based);
  const lastDay = new Date(year, month1Based, 0).getDate();
  const start = `${y}-${m}-01` as DayKey;
  const end = `${y}-${m}-${pad2(lastDay)}` as DayKey;
  return enumerateDaysInclusive(start, end);
}

function ceilToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return step;
  return Math.ceil(value / step) * step;
}

/**
 * Builds the day-key set required to hydrate {@link buildActivityYearlyCardModel} for `selectedYear`.
 *
 * Returns Jan 1 of `selectedYear` through `min(Dec 31 of selectedYear, anchorEndDay)` — i.e. **never
 * past local yesterday**, so the rollup fetch never has to wait on a partial "today" rollup. The
 * resulting list is sorted ascending and contains 0 entries when the requested year is entirely in
 * the future (e.g. selectedYear > current calendar year).
 */
export function computeActivityYearlyCardFetchDayKeys(
  selectedYear: number,
  todayDayKey: DayKey,
): DayKey[] {
  const anchor = getActivityOverviewAnchorEndDay(todayDayKey);
  const anchorYear = Number.parseInt(anchor.slice(0, 4), 10);
  if (selectedYear > anchorYear) return [];
  const yStart = `${selectedYear}-01-01` as DayKey;
  const yEnd = (selectedYear < anchorYear ? `${selectedYear}-12-31` : anchor) as DayKey;
  if (yEnd < yStart) return [];
  return enumerateDaysInclusive(yStart, yEnd);
}

/**
 * Builds the yearly card model for `selectedYear`.
 *
 * - **Current year**: months are aggregated across days with numeric rollups up to and including
 *   the anchor (yesterday). The current month's bar covers MTD-through-anchor. Months after the
 *   anchor's month are flagged future and return `averageSteps: null`.
 * - **Prior years**: months are aggregated across the full calendar month using only numeric days.
 *
 * The hero "averageStepsPerDay" is the mean of every numeric day in the year window (numerator =
 * sum of steps; denominator = count of numeric days). When no numeric days exist, the model
 * returns `hasData: false`, `isEmpty: true`, and `averageDisplay: ""` so the card can render an
 * empty state without divide-by-zero or "0 avg steps per day" surprises.
 */
export function buildActivityYearlyCardModel(input: {
  selectedYear: number;
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityYearlyCardModel {
  const { selectedYear, todayDayKey, rollupByDay } = input;
  const anchor = getActivityOverviewAnchorEndDay(todayDayKey);
  const anchorYear = Number.parseInt(anchor.slice(0, 4), 10);
  const anchorMonthIndex = Number.parseInt(anchor.slice(5, 7), 10) - 1;
  const todayMonthKey = anchor.slice(0, 7);

  const isCurrentYear = selectedYear === anchorYear;

  let yearSum = 0;
  let yearNumericCount = 0;
  const months: ActivityYearlyChartMonth[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthKey = `${selectedYear}-${pad2(monthIndex + 1)}`;
    const isFutureMonth = isCurrentYear
      ? monthIndex > anchorMonthIndex
      : selectedYear > anchorYear;
    const isCurrentMonth = isCurrentYear && monthIndex === anchorMonthIndex;

    if (isFutureMonth) {
      months.push({
        monthIndex,
        monthKey,
        label: ACTIVITY_YEARLY_MONTH_LETTERS[monthIndex]!,
        averageSteps: null,
        numericDayCount: 0,
        isFutureMonth: true,
        isCurrentMonth: false,
      });
      continue;
    }

    const dayKeys = dayKeysForMonthWithinYear(selectedYear, monthIndex + 1);
    let monthSum = 0;
    let monthNumeric = 0;
    for (const dk of dayKeys) {
      if (dk > anchor) break;
      const e = rollupByDay[dk];
      if (e?.kind !== "numeric") continue;
      monthSum += e.steps;
      monthNumeric += 1;
    }

    yearSum += monthSum;
    yearNumericCount += monthNumeric;

    months.push({
      monthIndex,
      monthKey,
      label: ACTIVITY_YEARLY_MONTH_LETTERS[monthIndex]!,
      averageSteps: monthNumeric > 0 ? Math.round(monthSum / monthNumeric) : null,
      numericDayCount: monthNumeric,
      isFutureMonth: false,
      isCurrentMonth,
    });
  }

  const hasData = yearNumericCount > 0;
  const averageStepsPerDay = hasData ? Math.round(yearSum / yearNumericCount) : 0;
  const averageDisplay = hasData ? averageStepsPerDay.toLocaleString() : "";

  const peakMonthlyAverage = months.reduce<number>((acc, m) => {
    if (m.averageSteps == null) return acc;
    return m.averageSteps > acc ? m.averageSteps : acc;
  }, 0);
  const chartMaxScale = ceilToStep(Math.max(peakMonthlyAverage, averageStepsPerDay), 500);

  return {
    year: selectedYear,
    title: `${selectedYear} Activity`,
    rangeLabel: String(selectedYear),
    isCurrentYear,
    hasData,
    averageStepsPerDay,
    averageDisplay,
    averageQualifier: "avg steps per day",
    months,
    chartMaxScale,
    todayMonthKey,
    isEmpty: !hasData,
  };
}
