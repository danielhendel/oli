/**
 * Yearly cardio analytics: total displayable miles per calendar month (presentation-only).
 *
 * Uses the same session filters as {@link aggregateDisplayableCardioForCalendarDays}
 * (Cardio Baseline / This Week): displayable cardio, supported modality (excludes Other/Unknown/Uncategorized
 * unless display rules say otherwise — same helpers as baseline).
 */

import {
  aggregateDisplayableCardioForInclusiveDayRange,
} from "@/lib/data/workouts/cardioRangeMetrics";
import {
  WORKOUT_OVERVIEW_ANALYTICS_YEAR,
} from "@/lib/data/workouts/workoutsCalendarModel";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { YearWorkloadPoint } from "@/lib/ui/workouts/StrengthYearlyWorkloadBars";

const CHART_MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthLetter(monthIndex1Based: number): string {
  if (monthIndex1Based < 1 || monthIndex1Based > 12) return "—";
  return CHART_MONTH_LETTERS[monthIndex1Based - 1] ?? "—";
}

function lastDayOfMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

export type CardioMonthlyMilesAnalyticsModel = {
  chartYear: typeof WORKOUT_OVERVIEW_ANALYTICS_YEAR;
  headerTitle: string;
  points: YearWorkloadPoint[];
  todayMonthKey: string;
  maxScale: number;
};

/**
 * Total miles per month for the analytics calendar year (Jan–Dec).
 * Months strictly after `todayDayKey` yield zero miles (no fabricated activity).
 */
export function buildCardioMonthlyMilesAnalyticsModel(input: {
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  analyticsYear: typeof WORKOUT_OVERVIEW_ANALYTICS_YEAR;
  todayDayKey: DayKey;
}): CardioMonthlyMilesAnalyticsModel {
  const { cardioCalendarDays, analyticsYear: year, todayDayKey } = input;
  const todayMonthKey = todayDayKey.slice(0, 7);

  const points: YearWorkloadPoint[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const monthKey = `${year}-${pad2(month)}`;
    const monthStart = `${year}-${pad2(month)}-01` as DayKey;
    const lastDom = lastDayOfMonth(year, month);
    const monthEnd = `${year}-${pad2(month)}-${pad2(lastDom)}` as DayKey;

    if (monthStart > todayDayKey) {
      points.push({
        monthKey,
        displayLabel: monthLetter(month),
        value: 0,
      });
      continue;
    }

    const rangeEnd = monthEnd < todayDayKey ? monthEnd : todayDayKey;
    const totals = aggregateDisplayableCardioForInclusiveDayRange(cardioCalendarDays, monthStart, rangeEnd);
    const miles = Math.round(totals.totalMiles * 1000) / 1000;

    points.push({
      monthKey,
      displayLabel: monthLetter(month),
      value: miles,
    });
  }

  const peak = Math.max(1, ...points.map((p) => p.value));
  const maxScale = Math.ceil(peak / 5) * 5;

  return {
    chartYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
    headerTitle: `${WORKOUT_OVERVIEW_ANALYTICS_YEAR} Cardio Miles`,
    points,
    todayMonthKey,
    maxScale,
  };
}
