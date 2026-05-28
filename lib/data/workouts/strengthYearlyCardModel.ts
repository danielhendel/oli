/**
 * Yearly Strength card — pure presentation model for the Strength overview screen.
 *
 * Contract:
 * - Counts strength **sessions** (after the standard `sessionMatchesOverviewStrengthTab`
 *   reconciliation rule) grouped by `monthKey` (`"YYYY-MM"`) for `selectedYear`.
 * - **Current year**: callers feed `monthlyCounts` derived in-memory from the already-hydrated
 *   `overviewSharedRange.days` via {@link countStrengthSessionsByMonthFromCalendarDays}.
 *   Months strictly **after** today's month render with `workoutCount: 0, isFutureMonth: true`.
 *   The current month is MTD-through-today.
 * - **Prior years**: callers feed `monthlyCounts` derived from
 *   `GET /users/me/workout-month-summaries?year=YYYY` via
 *   {@link mapWorkoutMonthSummariesToStrengthMonthlyCounts}. Months missing from the API response
 *   are treated as `0` (server hasn't computed a row yet).
 * - **Empty state**: when the year sums to zero, the model returns `hasData: false, isEmpty: true,
 *   totalDisplay: "0"` so the card can render a graceful empty state without divide-by-zero or
 *   misleading bars.
 *
 * Pure: no React, no network. The caller is responsible for choosing the appropriate `monthlyCounts`
 * source per the audit-approved policy.
 */

import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import { monthKeyFromDay } from "@/lib/data/workouts/workoutsCalendarModel";
import type { WorkoutMonthSummaryItemDto } from "@/lib/contracts/retrieval";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Single-letter month labels — matches Activity yearly card density. */
export const STRENGTH_YEARLY_MONTH_LETTERS = [
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

export type StrengthYearlyMonthLabel = (typeof STRENGTH_YEARLY_MONTH_LETTERS)[number];

export type StrengthYearlyChartMonth = {
  /** 0–11. */
  monthIndex: number;
  /** `"YYYY-MM"`. */
  monthKey: string;
  /** Single-letter label. */
  label: StrengthYearlyMonthLabel;
  /** Completed strength sessions in this month within `selectedYear`. */
  workoutCount: number;
  /** True when the month is strictly **after** today's month for the current year. */
  isFutureMonth: boolean;
  /** True when the month contains today's date. */
  isCurrentMonth: boolean;
};

export type StrengthYearlyCardModel = {
  /** 4-digit calendar year for the card. */
  year: number;
  /** Card title — e.g. `"2026 Strength"`. */
  title: string;
  /** Year nav label — e.g. `"2026"`. */
  rangeLabel: string;
  /** True when `year` matches the year of `todayDayKey`. */
  isCurrentYear: boolean;
  /** True iff at least one strength session was counted in `year` (≤ today). */
  hasData: boolean;
  /** Sum of completed strength sessions across all months in the displayed year. */
  totalWorkouts: number;
  /** Hero figure as a string — e.g. `"82"`. `"0"` when empty. */
  totalDisplay: string;
  /** Static qualifier paired with {@link totalDisplay}. */
  totalQualifier: "workouts completed";
  /** Always 12 entries, January → December. */
  months: readonly StrengthYearlyChartMonth[];
  /** Vertical scale max for bars (workout count), rounded up to the next 5. */
  chartMaxScale: number;
  /** `"YYYY-MM"` for today. Used by the bars to emphasize the current month. */
  todayMonthKey: string;
  /** Convenience for the card's empty state branch. */
  isEmpty: boolean;
};

/** Read-only map keyed by `"YYYY-MM"`. Missing keys are treated as `0` by the builder. */
export type StrengthYearlyMonthlyCounts = Readonly<Record<string, number>>;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ceilToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return step;
  return Math.ceil(value / step) * step;
}

/**
 * Current-year aggregator. Counts strength sessions per month from the already-hydrated
 * overview calendar slice. Days outside `year` are ignored so the same hydrate (which may span
 * adjacent months for the trailing weekly window) can be safely passed in.
 *
 * Uses {@link collectStrengthOverviewTabSessions} so the same reconciliation rules that drive
 * the Strength This Week card / Strength Baseline / server-side `workoutMonthSummaries` are
 * applied here — no parallel aggregation system.
 */
export function countStrengthSessionsByMonthFromCalendarDays(
  days: readonly WorkoutCalendarDayLike[],
  year: number,
): StrengthYearlyMonthlyCounts {
  const yearPrefix = `${year}-`;
  const counts: Record<string, number> = {};
  const sessions = collectStrengthOverviewTabSessions(days);
  for (const s of sessions) {
    const mk = monthKeyFromDay(s.day as DayKey);
    if (!mk.startsWith(yearPrefix)) continue;
    counts[mk] = (counts[mk] ?? 0) + 1;
  }
  return counts;
}

/**
 * Prior-year adapter. Extracts `strengthSessionCount` per `monthKey` from a
 * `GET /users/me/workout-month-summaries?year=YYYY` response.
 *
 * Missing month rows simply do not appear in the returned map — the builder treats absences as
 * `0`. Caller does not need to pre-populate.
 */
export function mapWorkoutMonthSummariesToStrengthMonthlyCounts(
  items: readonly WorkoutMonthSummaryItemDto[],
): StrengthYearlyMonthlyCounts {
  const counts: Record<string, number> = {};
  for (const it of items) {
    counts[it.monthKey] = it.strengthSessionCount;
  }
  return counts;
}

/**
 * Pure VM builder for the Yearly Strength card.
 *
 * - **Current year**: bars for future months (after today's month) render `workoutCount: 0` with
 *   `isFutureMonth: true` so the bar component can dim them visually. The current month renders
 *   MTD-through-today.
 * - **Prior years**: every month surfaces its full count.
 * - **Total**: sum of `workoutCount` across the 12 months.
 */
export function buildStrengthYearlyCardModel(input: {
  selectedYear: number;
  todayDayKey: DayKey;
  monthlyCounts: StrengthYearlyMonthlyCounts;
}): StrengthYearlyCardModel {
  const { selectedYear, todayDayKey, monthlyCounts } = input;
  const todayYear = Number.parseInt(todayDayKey.slice(0, 4), 10);
  const todayMonthIndex = Number.parseInt(todayDayKey.slice(5, 7), 10) - 1;
  const todayMonthKey = todayDayKey.slice(0, 7);
  const isCurrentYear = selectedYear === todayYear;

  let totalWorkouts = 0;
  const months: StrengthYearlyChartMonth[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthKey = `${selectedYear}-${pad2(monthIndex + 1)}`;
    const isFutureMonth = isCurrentYear
      ? monthIndex > todayMonthIndex
      : selectedYear > todayYear;
    const isCurrentMonth = isCurrentYear && monthIndex === todayMonthIndex;
    const workoutCount = isFutureMonth ? 0 : Math.max(0, monthlyCounts[monthKey] ?? 0);
    totalWorkouts += workoutCount;
    months.push({
      monthIndex,
      monthKey,
      label: STRENGTH_YEARLY_MONTH_LETTERS[monthIndex]!,
      workoutCount,
      isFutureMonth,
      isCurrentMonth,
    });
  }

  const hasData = totalWorkouts > 0;
  const peakMonthly = months.reduce<number>(
    (acc, m) => (m.workoutCount > acc ? m.workoutCount : acc),
    0,
  );
  const chartMaxScale = ceilToStep(peakMonthly, 5);

  return {
    year: selectedYear,
    title: `${selectedYear} Strength`,
    rangeLabel: String(selectedYear),
    isCurrentYear,
    hasData,
    totalWorkouts,
    totalDisplay: totalWorkouts.toLocaleString(),
    totalQualifier: "workouts completed",
    months,
    chartMaxScale,
    todayMonthKey,
    isEmpty: !hasData,
  };
}
