import type { DayKey } from "@/lib/ui/calendar/types";
import type { MonthYear } from "@/lib/ui/calendar/dateUtils";
import {
  addCalendarDaysToDayKey,
  enumerateDaysInclusive,
  getMonthFirstDay,
  getMonthLastDay,
} from "@/lib/ui/calendar/dateUtils";
import {
  filterWorkoutCalendarDaysInclusive,
  maxDayKey,
  minDayKey,
} from "@/lib/data/workouts/overviewCalendarRangeSlices";
import { buildStrengthMonthOverviewFromCalendarDays } from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import {
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  elapsedDaysForWorkoutOverviewAnalyticsYear,
  monthKeyFromDay,
  sessionMatchesOverviewStrengthTab,
  type WorkoutCalendarDayLike,
} from "@/lib/data/workouts/workoutsCalendarModel";
import {
  reconcileWorkoutSessionsForDay,
  type ReconciledWorkoutSession,
} from "@/lib/data/workouts/workoutSessionReconciliation";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  strengthOverviewTimeframeConsistencyRating,
  type StrengthOverviewTimeframeKey,
  type StrengthOverviewTimeframeRatingResult,
} from "@/lib/data/workouts/strengthOverviewTimeframeRating";

export type { StrengthOverviewTimeframeKey };

/** Rolling inclusive day span for the "3 Month" window (today and 89 prior days = 90). */
export const STRENGTH_OVERVIEW_THREE_MONTH_ROLLING_DAYS = 90;

export type StrengthOverviewTimeframeModel = {
  key: StrengthOverviewTimeframeKey;
  label: string;
  totalWorkouts: number;
  avgWorkoutsPerWeek: number | null;
  /** Display line: "{n} workout(s) · {avg} / week" for the card header. */
  compactStatsSummary: string;
  rating: StrengthOverviewTimeframeRatingResult;
};

/** Pure formatter for Strength Overview compact stats (UI copy contract). */
export function formatStrengthOverviewCompactStatsLine(
  totalWorkouts: number,
  avgWorkoutsPerWeek: number | null,
): string {
  const n = Math.max(0, Math.round(totalWorkouts));
  const w = n === 1 ? "workout" : "workouts";
  const avg =
    typeof avgWorkoutsPerWeek === "number" && Number.isFinite(avgWorkoutsPerWeek)
      ? avgWorkoutsPerWeek.toFixed(1)
      : "—";
  return `${n} ${w} · ${avg} / week`;
}

export type StrengthOverviewCardModel = {
  timeframes: StrengthOverviewTimeframeModel[];
};

function monthYearFromMonthKey(monthKey: string): MonthYear | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

/** Strength Overview + Baseline: sessions that count toward Strength tabs (`sessionType === "strength"` only). */
export function collectStrengthOverviewTabSessions(days: readonly WorkoutCalendarDayLike[]): ReconciledWorkoutSession[] {
  const out: ReconciledWorkoutSession[] = [];
  for (const d of days) {
    for (const s of reconcileWorkoutSessionsForDay(d.day, d.workouts)) {
      if (sessionMatchesOverviewStrengthTab(s)) out.push(s);
    }
  }
  return out;
}

/**
 * Single source for Overview “This Week” + Strength This Week card: local calendar week slice through
 * `weekCoverageEnd = max(weekStart, min(today, weekEnd))`, same strength-tab session rules.
 */
export function computeStrengthThisWeekWindowMetrics(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  weekStartDay: DayKey;
  weekEndDay: DayKey;
}): {
  totalWorkouts: number;
  avgWorkoutsPerWeek: number | null;
  /** Denominator used for avg (≥1 when week slice is valid). */
  elapsedCalendarDaysForAvg: number;
  /** Sum of `durationMinutes` per strength-tab session in the week slice; null when no session reports duration. */
  totalStrengthMinutesAggregated: number | null;
} {
  const sortedDays = [...input.strengthCalendarDays].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
  const weekDays = filterWorkoutCalendarDaysInclusive(sortedDays, input.weekStartDay, input.weekEndDay);
  const weekSessions = collectStrengthOverviewTabSessions(weekDays);
  const totalStrengthMinutesAggregated = aggregateStrengthSessionMinutesFromSessions(weekSessions);
  const weekCoverageEnd = maxDayKey(input.weekStartDay, minDayKey(input.todayDayKey, input.weekEndDay));
  const weekElapsedDays =
    weekCoverageEnd < input.weekStartDay ? 0 : enumerateDaysInclusive(input.weekStartDay, weekCoverageEnd).length;
  const weekElapsedForMetrics = Math.max(weekElapsedDays, 1);
  const weekMetrics = metricsForSessions(weekSessions, weekElapsedForMetrics);
  return {
    totalWorkouts: weekMetrics.totalWorkouts,
    avgWorkoutsPerWeek: weekMetrics.avgWorkoutsPerWeek,
    elapsedCalendarDaysForAvg: weekElapsedForMetrics,
    totalStrengthMinutesAggregated,
  };
}

/** Repo-truth: whether local `todayDayKey` has at least one strength-tab session in the hydrated calendar. */
export function hasStrengthWorkoutLoggedToday(
  strengthCalendarDays: readonly WorkoutCalendarDayLike[],
  todayDayKey: DayKey,
): boolean {
  const sortedDays = [...strengthCalendarDays].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const row = sortedDays.find((d) => d.day === todayDayKey);
  if (row == null) return false;
  return collectStrengthOverviewTabSessions([row]).length > 0;
}

function computeAvgPerWeekFromTotals(totalWorkouts: number, elapsedCalendarDays: number): number | null {
  if (totalWorkouts <= 0) return null;
  if (!Number.isFinite(elapsedCalendarDays) || elapsedCalendarDays <= 0) return null;
  return (totalWorkouts * 7) / elapsedCalendarDays;
}

function metricsForSessions(
  sessions: ReconciledWorkoutSession[],
  elapsedCalendarDays: number,
): {
  totalWorkouts: number;
  avgWorkoutsPerWeek: number | null;
} {
  const totalWorkouts = sessions.length;
  return {
    totalWorkouts,
    avgWorkoutsPerWeek: computeAvgPerWeekFromTotals(totalWorkouts, elapsedCalendarDays),
  };
}

/** Sum positive `session.durationMinutes` once per reconciled strength-tab session (no workout double-count). */
export function aggregateStrengthSessionMinutesFromSessions(
  sessions: readonly ReconciledWorkoutSession[],
): number | null {
  let sum = 0;
  let any = false;
  for (const s of sessions) {
    if (typeof s.durationMinutes === "number" && Number.isFinite(s.durationMinutes) && s.durationMinutes > 0) {
      sum += Math.round(s.durationMinutes);
      any = true;
    }
  }
  return any ? sum : null;
}

function elapsedDaysInCurrentMonthThroughToday(todayDayKey: DayKey): number {
  const mk = monthKeyFromDay(todayDayKey);
  const my = monthYearFromMonthKey(mk);
  if (!my) return 0;
  const monthStart = getMonthFirstDay(my);
  const monthEnd = getMonthLastDay(my);
  const coverageEnd = minDayKey(maxDayKey(monthStart, todayDayKey), monthEnd);
  if (coverageEnd < monthStart) return 0;
  return enumerateDaysInclusive(monthStart, coverageEnd).length;
}

export function buildStrengthOverviewCardModel(input: {
  /** Strength-domain rows across the full overview hydrate (week ∪ recent ∪ analytics). */
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  analyticsDaysSlice: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  weekStartDay: DayKey;
  weekEndDay: DayKey;
  manualWorkoutSummaries: readonly ManualWorkoutDaySummary[];
}): StrengthOverviewCardModel {
  const { todayDayKey, weekStartDay, weekEndDay, manualWorkoutSummaries } = input;

  const ytdBundle = buildWorkoutOverviewAnalyticsFromCalendarDays([...input.analyticsDaysSlice], {
    todayDayKey,
  });
  const ytdStrength = ytdBundle.metricsByTab.strength;
  const ytdElapsed = elapsedDaysForWorkoutOverviewAnalyticsYear(todayDayKey);

  const focusMonthKey = monthKeyFromDay(todayDayKey);
  const mtdOverview = buildStrengthMonthOverviewFromCalendarDays(
    [...input.analyticsDaysSlice],
    focusMonthKey,
    {
      todayDayKey,
      manualJournalSummaries: manualWorkoutSummaries,
    },
  );
  const mtdStrength = mtdOverview.metrics;
  const mtdElapsed = elapsedDaysInCurrentMonthThroughToday(todayDayKey);

  const threeStart = addCalendarDaysToDayKey(todayDayKey, -(STRENGTH_OVERVIEW_THREE_MONTH_ROLLING_DAYS - 1));
  const threeDays = filterWorkoutCalendarDaysInclusive(
    [...input.strengthCalendarDays],
    threeStart,
    todayDayKey,
  );
  const threeSessions = collectStrengthOverviewTabSessions(threeDays);
  const threeElapsed = enumerateDaysInclusive(threeStart, todayDayKey).length;
  const threeMetrics = metricsForSessions(threeSessions, threeElapsed);

  const weekMetricsBundle = computeStrengthThisWeekWindowMetrics({
    strengthCalendarDays: input.strengthCalendarDays,
    todayDayKey,
    weekStartDay,
    weekEndDay,
  });
  const weekMetrics = {
    totalWorkouts: weekMetricsBundle.totalWorkouts,
    avgWorkoutsPerWeek: weekMetricsBundle.avgWorkoutsPerWeek,
  };
  const weekElapsedForMetrics = weekMetricsBundle.elapsedCalendarDaysForAvg;

  const ytdRating = strengthOverviewTimeframeConsistencyRating({
    timeframe: "ytd",
    avgWorkoutsPerWeek: ytdStrength.avgPerWeek,
    totalWorkouts: ytdStrength.totalWorkouts,
    elapsedCalendarDays: ytdElapsed > 0 ? ytdElapsed : 1,
  });

  const threeRating = strengthOverviewTimeframeConsistencyRating({
    timeframe: "threeMonth",
    avgWorkoutsPerWeek: threeMetrics.avgWorkoutsPerWeek,
    totalWorkouts: threeMetrics.totalWorkouts,
    elapsedCalendarDays: threeElapsed > 0 ? threeElapsed : 1,
  });

  const mtdRating = strengthOverviewTimeframeConsistencyRating({
    timeframe: "mtd",
    avgWorkoutsPerWeek: mtdStrength.avgPerWeek,
    totalWorkouts: mtdStrength.totalWorkouts,
    elapsedCalendarDays: mtdElapsed > 0 ? mtdElapsed : 1,
  });

  const weekRating = strengthOverviewTimeframeConsistencyRating({
    timeframe: "thisWeek",
    avgWorkoutsPerWeek: weekMetrics.avgWorkoutsPerWeek,
    totalWorkouts: weekMetrics.totalWorkouts,
    elapsedCalendarDays: weekElapsedForMetrics,
  });

  const timeframes: StrengthOverviewTimeframeModel[] = [
    {
      key: "ytd",
      label: "YTD",
      totalWorkouts: ytdStrength.totalWorkouts,
      avgWorkoutsPerWeek: ytdStrength.avgPerWeek,
      compactStatsSummary: formatStrengthOverviewCompactStatsLine(
        ytdStrength.totalWorkouts,
        ytdStrength.avgPerWeek,
      ),
      rating: ytdRating,
    },
    {
      key: "threeMonth",
      label: "3 Month",
      totalWorkouts: threeMetrics.totalWorkouts,
      avgWorkoutsPerWeek: threeMetrics.avgWorkoutsPerWeek,
      compactStatsSummary: formatStrengthOverviewCompactStatsLine(
        threeMetrics.totalWorkouts,
        threeMetrics.avgWorkoutsPerWeek,
      ),
      rating: threeRating,
    },
    {
      key: "mtd",
      label: "MTD",
      totalWorkouts: mtdStrength.totalWorkouts,
      avgWorkoutsPerWeek: mtdStrength.avgPerWeek,
      compactStatsSummary: formatStrengthOverviewCompactStatsLine(
        mtdStrength.totalWorkouts,
        mtdStrength.avgPerWeek,
      ),
      rating: mtdRating,
    },
    {
      key: "thisWeek",
      label: "This Week",
      totalWorkouts: weekMetrics.totalWorkouts,
      avgWorkoutsPerWeek: weekMetrics.avgWorkoutsPerWeek,
      compactStatsSummary: formatStrengthOverviewCompactStatsLine(
        weekMetrics.totalWorkouts,
        weekMetrics.avgWorkoutsPerWeek,
      ),
      rating: weekRating,
    },
  ];

  return { timeframes };
}
