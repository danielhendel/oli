/**
 * Yearly Cardio card — pure presentation model.
 *
 * Mirrors {@link buildStrengthYearlyCardModel} (and the `ActivityYearlyCard` sibling): single
 * VM owns the chart points, hero figure, year-nav label, and the empty-state flag.
 *
 * Per the audit policy approved for this PR:
 * - **Current year**: sums `cardioSessionDistanceMiles` (same filter rules as Cardio Baseline /
 *   This Week) per month from the already-hydrated overview calendar slice — no parallel server
 *   aggregation.
 * - **Prior years**: monthly cardio mileage is **not** exposed by the existing
 *   `GET /users/me/workout-month-summaries` route (only session count + duration). Until that
 *   row gains a `cardioDistanceMeters` field in a follow-up backend PR, prior years render a
 *   clean placeholder via `hasData: false, totalDisplay: "0.0", isEmpty: true`.
 *
 * Pure: no React, no Firebase, no network. The caller is responsible for choosing the right
 * monthly miles source per the policy above (typically the current-year aggregator).
 */

import {
  aggregateDisplayableCardioForInclusiveDayRange,
} from "@/lib/data/workouts/cardioRangeMetrics";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Single-letter month labels — matches Strength / Activity yearly card density. */
export const CARDIO_YEARLY_MONTH_LETTERS = [
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

export type CardioYearlyMonthLabel = (typeof CARDIO_YEARLY_MONTH_LETTERS)[number];

export type CardioYearlyChartMonth = {
  monthIndex: number;
  /** `"YYYY-MM"`. */
  monthKey: string;
  label: CardioYearlyMonthLabel;
  /** Total displayable cardio miles in this month (0 for future / no data). */
  miles: number;
  /** True when the month is strictly after today's month for the current year. */
  isFutureMonth: boolean;
  /** True when the month contains today's date. */
  isCurrentMonth: boolean;
};

export type CardioYearlyCardModel = {
  year: number;
  /** Card title — e.g. `"2026 Cardio"`. */
  title: string;
  /** Year nav label — e.g. `"2026"`. */
  rangeLabel: string;
  isCurrentYear: boolean;
  hasData: boolean;
  totalMiles: number;
  /** Hero figure as a string — e.g. `"42.6"`. `"0.0"` when empty. */
  totalDisplay: string;
  /** Static qualifier paired with {@link totalDisplay}. */
  totalQualifier: "mi completed";
  /** Always 12 entries, January → December. */
  months: readonly CardioYearlyChartMonth[];
  /** Vertical scale max for bars (miles), rounded up to the next 5 (min 5). */
  chartMaxScale: number;
  /** `"YYYY-MM"` for today. Used by the bars to emphasize the current month. */
  todayMonthKey: string;
  isEmpty: boolean;
};

/** Read-only map keyed by `"YYYY-MM"` → total displayable miles. Missing keys treated as 0. */
export type CardioYearlyMonthlyMiles = Readonly<Record<string, number>>;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ceilToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return step;
  return Math.ceil(value / step) * step;
}

function lastDayOfMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

/**
 * Current-year aggregator. Sums displayable cardio miles per month from the already-hydrated
 * overview calendar slice (uses {@link aggregateDisplayableCardioForInclusiveDayRange} — same
 * filters as Cardio Baseline / This Week). Months strictly after today's month return 0 (no
 * fabricated activity).
 */
export function sumCardioMilesByMonthFromCalendarDays(
  days: readonly WorkoutCalendarDayLike[],
  year: number,
  todayDayKey: DayKey,
): CardioYearlyMonthlyMiles {
  const counts: Record<string, number> = {};
  for (let month = 1; month <= 12; month += 1) {
    const monthKey = `${year}-${pad2(month)}`;
    const monthStart = `${year}-${pad2(month)}-01` as DayKey;
    if (monthStart > todayDayKey) {
      counts[monthKey] = 0;
      continue;
    }
    const last = lastDayOfMonth(year, month);
    const monthEnd = `${year}-${pad2(month)}-${pad2(last)}` as DayKey;
    const rangeEnd = monthEnd < todayDayKey ? monthEnd : todayDayKey;
    const totals = aggregateDisplayableCardioForInclusiveDayRange(days, monthStart, rangeEnd);
    counts[monthKey] = Math.round(totals.totalMiles * 1000) / 1000;
  }
  return counts;
}

function formatYearlyMilesDisplay(totalMiles: number): string {
  if (!Number.isFinite(totalMiles) || totalMiles <= 0) return "0.0";
  return totalMiles.toFixed(1);
}

/**
 * Pure VM builder for the Yearly Cardio card.
 *
 * - **Current year**: bars for future months render `miles: 0, isFutureMonth: true`. Current
 *   month is MTD-through-today.
 * - **Prior years**: with no backend mileage rollup yet, callers should pass `monthlyMiles = {}`
 *   so every month surfaces `0` and the card renders the placeholder/empty branch cleanly.
 */
export function buildCardioYearlyCardModel(input: {
  selectedYear: number;
  todayDayKey: DayKey;
  monthlyMiles: CardioYearlyMonthlyMiles;
}): CardioYearlyCardModel {
  const { selectedYear, todayDayKey, monthlyMiles } = input;
  const todayYear = Number.parseInt(todayDayKey.slice(0, 4), 10);
  const todayMonthIndex = Number.parseInt(todayDayKey.slice(5, 7), 10) - 1;
  const todayMonthKey = todayDayKey.slice(0, 7);
  const isCurrentYear = selectedYear === todayYear;

  let totalMiles = 0;
  const months: CardioYearlyChartMonth[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthKey = `${selectedYear}-${pad2(monthIndex + 1)}`;
    const isFutureMonth = isCurrentYear
      ? monthIndex > todayMonthIndex
      : selectedYear > todayYear;
    const isCurrentMonth = isCurrentYear && monthIndex === todayMonthIndex;
    const raw = monthlyMiles[monthKey];
    const miles = isFutureMonth
      ? 0
      : typeof raw === "number" && Number.isFinite(raw)
        ? Math.max(0, raw)
        : 0;
    totalMiles += miles;
    months.push({
      monthIndex,
      monthKey,
      label: CARDIO_YEARLY_MONTH_LETTERS[monthIndex]!,
      miles,
      isFutureMonth,
      isCurrentMonth,
    });
  }

  const hasData = totalMiles > 0;
  const peakMonthly = months.reduce<number>((acc, m) => (m.miles > acc ? m.miles : acc), 0);
  const chartMaxScale = ceilToStep(peakMonthly, 5);

  return {
    year: selectedYear,
    title: `${selectedYear} Cardio`,
    rangeLabel: String(selectedYear),
    isCurrentYear,
    hasData,
    totalMiles,
    totalDisplay: formatYearlyMilesDisplay(totalMiles),
    totalQualifier: "mi completed",
    months,
    chartMaxScale,
    todayMonthKey,
    isEmpty: !hasData,
  };
}
