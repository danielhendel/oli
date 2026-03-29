import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive, getMonthFirstDay, getMonthLastDay, getMonthGrid } from "@/lib/ui/calendar/dateUtils";
import { reconcileWorkoutSessionsForDay, type ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  monthKeyFromDay,
  sessionMatchesOverviewStrengthTab,
  WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES,
  type WorkoutCalendarDayLike,
} from "@/lib/data/workouts/workoutsCalendarModel";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { trainingVolumeKgForManualExercises } from "@/lib/workouts/strength/strengthVolumeKg";

export type StrengthMonthChartBar = {
  /** Stable key for the month-grid row (0-based index). */
  weekKey: string;
  /** Compact week-of-month label (1 = first calendar row in the month grid). */
  label: string;
  value: number;
};

export type StrengthMonthScopedMetrics = {
  totalWorkouts: number;
  avgPerWeek: number | null;
  avgDurationMinutes: number | null;
  /** Mean kg volume over workouts that have usable volume (ingested sets or local journal totalVolume). */
  typicalVolumeKg: number | null;
};

export type BuildStrengthMonthOverviewOptions = {
  /** Device "today" for elapsed-month and future/past month handling. */
  todayDayKey: DayKey;
  /** Local journal sessions from {@link listManualWorkoutDaySummaries}; calendar may omit them until ingested. */
  manualJournalSummaries?: readonly ManualWorkoutDaySummary[];
};

function parseMonthYearFromMonthKey(monthKey: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function strengthSessionVolumeKgFromWorkouts(session: ReconciledWorkoutSession): number | null {
  let sum = 0;
  let any = false;
  for (const w of session.workouts) {
    const v = w.strengthVolumeKg;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

function dayHasIngestedStrengthVolumeWithSets(
  sessionsInMonth: ReconciledWorkoutSession[],
  day: DayKey,
): boolean {
  return sessionsInMonth.some(
    (s) =>
      s.day === day &&
      s.workouts.some(
        (w) =>
          w.rawKind === "strength_workout" &&
          typeof w.strengthVolumeKg === "number" &&
          Number.isFinite(w.strengthVolumeKg) &&
          w.strengthVolumeKg > 0,
      ),
  );
}

/**
 * Typical volume: one sample per strength session with parsed ingest volume, plus journal session totals
 * when the day does not already have ingested strength_workout volume (avoids double-counting API-logged work).
 */
function collectTypicalVolumeSamplesKg(
  sessionsInMonth: ReconciledWorkoutSession[],
  manualRowsInMonth: readonly ManualWorkoutDaySummary[],
): number[] {
  const samples: number[] = [];
  for (const s of sessionsInMonth) {
    const v = strengthSessionVolumeKgFromWorkouts(s);
    if (v != null && v > 0) samples.push(v);
  }
  for (const row of manualRowsInMonth) {
    if (dayHasIngestedStrengthVolumeWithSets(sessionsInMonth, row.day as DayKey)) continue;
    let vol: number | null = null;
    if (row.exercises.length > 0) {
      const fromSets = trainingVolumeKgForManualExercises(row.exercises);
      if (fromSets > 0) vol = fromSets;
    }
    if (vol == null && row.totalVolume != null && Number.isFinite(row.totalVolume) && row.totalVolume > 0) {
      vol = row.totalVolume;
    }
    if (vol == null || vol <= 0) continue;
    samples.push(vol);
  }
  return samples;
}

function meanPositive(samples: number[]): number | null {
  if (samples.length === 0) return null;
  const sum = samples.reduce((a, b) => a + b, 0);
  return sum / samples.length;
}

/**
 * Avg per week = weekly rate over elapsed calendar days in the scoring window:
 *   (totalWorkouts * 7) / elapsedDays
 *
 * - Past months (YYYY-MM strictly before today's month): elapsedDays = full month length.
 * - Current calendar month: elapsedDays = inclusive days from month start through min(today, month end).
 * - Future months: no rate (null) when there is nothing to score; if workouts exist, still use full month length for denominator to stay bounded.
 */
function computeAvgPerWeekForMonth(
  totalWorkouts: number,
  focusMonthKey: string,
  todayDayKey: DayKey,
  monthStart: DayKey,
  monthEnd: DayKey,
): number | null {
  if (totalWorkouts === 0) return null;

  const todayMonthKey = monthKeyFromDay(todayDayKey);
  let coverageEnd: DayKey;

  if (focusMonthKey > todayMonthKey) {
    // Future month — avoid pretending a full month elapsed; still show a conservative rate over full month if data exists.
    coverageEnd = monthEnd;
  } else if (focusMonthKey < todayMonthKey) {
    coverageEnd = monthEnd;
  } else {
    if (todayDayKey < monthStart) return null;
    coverageEnd = todayDayKey > monthEnd ? monthEnd : todayDayKey;
  }

  const elapsedDays = enumerateDaysInclusive(monthStart, coverageEnd).length;
  if (elapsedDays <= 0) return null;
  return (totalWorkouts * 7) / elapsedDays;
}

/** Short month label (e.g. Jan, Mar) for the given `YYYY-MM` key. */
export function monthShortLabelFromMonthKey(monthKey: string): string {
  const parsed = parseMonthYearFromMonthKey(monthKey);
  if (!parsed) return "—";
  const d = new Date(Date.UTC(parsed.year, parsed.month - 1, 1, 12, 0, 0, 0));
  return d.toLocaleDateString(undefined, { month: "short" });
}

/**
 * Strength-only overview for the focus month: chart buckets = {@link getMonthGrid} rows (same structure as month calendar UI).
 */
export function buildStrengthMonthOverviewFromCalendarDays(
  days: WorkoutCalendarDayLike[],
  focusMonthKey: string,
  options: BuildStrengthMonthOverviewOptions,
): { chartBars: StrengthMonthChartBar[]; metrics: StrengthMonthScopedMetrics } {
  const parsed = parseMonthYearFromMonthKey(focusMonthKey);
  if (!parsed) {
    return {
      chartBars: [],
      metrics: {
        totalWorkouts: 0,
        avgPerWeek: null,
        avgDurationMinutes: null,
        typicalVolumeKg: null,
      },
    };
  }

  const monthStart: DayKey = getMonthFirstDay(parsed);
  const monthEnd: DayKey = getMonthLastDay(parsed);
  const monthGrid = getMonthGrid(parsed);

  const sessionsInMonth = days
    .filter((d) => monthKeyFromDay(d.day) === focusMonthKey)
    .flatMap((d) => reconcileWorkoutSessionsForDay(d.day, d.workouts))
    .filter(sessionMatchesOverviewStrengthTab);

  const manualRowsInMonth = (options.manualJournalSummaries ?? []).filter(
    (row) => monthKeyFromDay(row.day as DayKey) === focusMonthKey,
  );

  const dayToGridRow = new Map<DayKey, number>();
  monthGrid.forEach((row, rowIndex) => {
    for (const dk of row) {
      if (dk != null) dayToGridRow.set(dk, rowIndex);
    }
  });

  const countsByRow = monthGrid.map(() => 0);
  for (const s of sessionsInMonth) {
    const ri = dayToGridRow.get(s.day);
    if (ri != null && ri >= 0 && ri < countsByRow.length) {
      const prev = countsByRow[ri] ?? 0;
      countsByRow[ri] = prev + 1;
    }
  }

  const chartBars: StrengthMonthChartBar[] = countsByRow.map((value, i) => ({
    weekKey: `row-${i}`,
    label: String(i + 1),
    value,
  }));

  const totalWorkouts = sessionsInMonth.length;

  let durationSum = 0;
  let durationCount = 0;
  for (const s of sessionsInMonth) {
    const dm = s.durationMinutes;
    if (
      typeof dm === "number" &&
      Number.isFinite(dm) &&
      dm > 0 &&
      dm <= WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES
    ) {
      durationSum += dm;
      durationCount += 1;
    }
  }

  const volumeSamples = collectTypicalVolumeSamplesKg(sessionsInMonth, manualRowsInMonth);

  return {
    chartBars,
    metrics: {
      totalWorkouts,
      avgPerWeek: computeAvgPerWeekForMonth(
        totalWorkouts,
        focusMonthKey,
        options.todayDayKey,
        monthStart,
        monthEnd,
      ),
      avgDurationMinutes: durationCount > 0 ? durationSum / durationCount : null,
      typicalVolumeKg: meanPositive(volumeSamples),
    },
  };
}
