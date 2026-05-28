/**
 * Cardio Weekly Distance / Duration card models — pure builders that emit `ActivityWeeklyStepsBars`
 * compatible point arrays for a Sun→Sat calendar week. No fake values, no parallel aggregation:
 *
 * - Distance per day: sum of `cardioSessionDistanceMiles` for **displayable + supported modality**
 *   cardio sessions on that day (same filter rules as `buildCardioTodayCardModel`).
 * - Duration per day: sum of the canonical session duration display value (uses
 *   `resolveWorkoutDisplayDurationMinutes` like Today / This Week so overrides remain authoritative).
 *
 * Future days emit `value=0`, `isFutureDay=true` so the bar chart can render the placeholder
 * pattern. The chart vertical scale is rounded up so every bar has a stable baseline. Pure +
 * typed: no React, no Firebase, no I/O.
 */

import type {
  ActivityThisWeekChartPoint,
} from "@/lib/data/activity/activityThisWeekCardModel";
import {
  cardioSessionDistanceMiles,
  isDisplayableCardioHistorySession,
  isSupportedCardioSessionModality,
} from "@/lib/data/workouts/cardioSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  buildWorkoutSessionSurfaceModel,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import {
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Single-letter weekday labels — same density / order as `ACTIVITY_THIS_WEEK_CHART_DAY_LABELS`. */
export const CARDIO_WEEKLY_METRIC_CHART_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type CardioWeeklyMetricCardModel = {
  /** Aggregated week summary, e.g. `"6.8 mi total"` or `"90 min total"`. */
  totalLabel: string;
  /** Numeric total used by header / a11y / tests. */
  totalNumeric: number;
  /** True when no day in the visible week reports the metric. */
  isEmpty: boolean;
  /** Seven chart points Sun → Sat. `value` is the metric in display units (miles or minutes). */
  chartPoints: readonly ActivityThisWeekChartPoint[];
  /** Vertical scale max for `ActivityWeeklyStepsBars` (display units). Always > 0. */
  chartMaxScale: number;
};

/** Sum displayable + supported-modality cardio miles per day from reconciled sessions. */
function dailyCardioDistanceMiles(sessions: readonly ReconciledWorkoutSession[]): number {
  let total = 0;
  for (const s of sessions) {
    if (s.sessionType !== "cardio") continue;
    if (!isDisplayableCardioHistorySession(s)) continue;
    if (!isSupportedCardioSessionModality(s)) continue;
    const mi = cardioSessionDistanceMiles(s);
    if (typeof mi === "number" && Number.isFinite(mi) && mi > 0) total += mi;
  }
  return total;
}

/** Sum displayable cardio duration minutes per day using the same display path as Today / This Week. */
function dailyCardioDurationMinutes(
  sessions: readonly ReconciledWorkoutSession[],
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
  durableTitlesByWorkoutId: Record<string, string | undefined>,
): number {
  let total = 0;
  for (const s of sessions) {
    if (s.sessionType !== "cardio") continue;
    if (!isDisplayableCardioHistorySession(s)) continue;
    if (!isSupportedCardioSessionModality(s)) continue;
    const surface = buildWorkoutSessionSurfaceModel(
      s,
      overridesByWorkoutId,
      "cardio",
      null,
      durableTitlesByWorkoutId,
    );
    const sessionOverride = pickWorkoutOverrideForSession(s, overridesByWorkoutId);
    const resolved = resolveWorkoutDisplay(
      surface.metricsWorkout,
      sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
    );
    const minutes = resolveWorkoutDisplayDurationMinutes({
      overrideDurationMinutes: resolved.displayDurationMinutes,
      sessionDurationMinutes: null,
      fallbackWorkoutDurationMinutes: surface.metricsWorkout.durationMinutes ?? s.durationMinutes,
    });
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) total += minutes;
  }
  return total;
}

function indexCalendarDaysByDayKey(
  days: readonly WorkoutCalendarDayLike[],
): Map<DayKey, WorkoutCalendarDayLike> {
  const m = new Map<DayKey, WorkoutCalendarDayLike>();
  for (const d of days) m.set(d.day, d);
  return m;
}

function roundUpToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return step;
  return Math.ceil(value / step) * step;
}

function formatMilesTotalLabel(totalMiles: number): string {
  if (!Number.isFinite(totalMiles) || totalMiles <= 0) return "0.0 mi total";
  return `${totalMiles.toFixed(1)} mi total`;
}

function formatMinutesTotalLabel(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0 min total";
  return `${Math.round(totalMinutes)} min total`;
}

/** Display label for distance bars: "3.1" (1dp), or "" when 0 / future. */
export function formatCardioWeeklyDistanceBarLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(1);
}

/** Display label for duration bars: "35", or "" when 0 / future. */
export function formatCardioWeeklyDurationBarLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return `${Math.round(value)}`;
}

export type BuildCardioWeeklyMetricInput = {
  todayDayKey: DayKey;
  /** Seven Sun→Sat day keys for the displayed week — typically `EnergyWeekNavigationState.weekDayKeys`. */
  weekDayKeys: readonly DayKey[];
  /** Calendar days from the shared workouts cache (any superset of the displayed week). */
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId: Record<string, string | undefined>;
};

export function buildCardioWeeklyDistanceCardModel(
  input: BuildCardioWeeklyMetricInput,
): CardioWeeklyMetricCardModel {
  const { todayDayKey, weekDayKeys, cardioCalendarDays } = input;
  const byDay = indexCalendarDaysByDayKey(cardioCalendarDays);

  const dailyValues: number[] = [];
  const chartPoints: ActivityThisWeekChartPoint[] = weekDayKeys.map((dayKey, i) => {
    const label = CARDIO_WEEKLY_METRIC_CHART_DAY_LABELS[i] ?? "—";
    if (dayKey > todayDayKey) {
      dailyValues.push(0);
      return { dayKey, displayLabel: label, value: 0, isFutureDay: true };
    }
    const row = byDay.get(dayKey);
    if (!row || row.workouts.length === 0) {
      dailyValues.push(0);
      return { dayKey, displayLabel: label, value: 0, isFutureDay: false };
    }
    const sessions = reconcileWorkoutSessionsForDay(row.day, row.workouts);
    const miles = dailyCardioDistanceMiles(sessions);
    dailyValues.push(miles);
    return { dayKey, displayLabel: label, value: miles, isFutureDay: false };
  });

  const total = dailyValues.reduce((acc, v) => acc + v, 0);
  const peakDaily = dailyValues.reduce((m, v) => (v > m ? v : m), 0);
  const chartMaxScale = roundUpToStep(Math.max(peakDaily, 1), 1);

  return {
    totalLabel: formatMilesTotalLabel(total),
    totalNumeric: total,
    isEmpty: total <= 0,
    chartPoints,
    chartMaxScale,
  };
}

export function buildCardioWeeklyDurationCardModel(
  input: BuildCardioWeeklyMetricInput,
): CardioWeeklyMetricCardModel {
  const { todayDayKey, weekDayKeys, cardioCalendarDays, overridesByWorkoutId, durableTitlesByWorkoutId } =
    input;
  const byDay = indexCalendarDaysByDayKey(cardioCalendarDays);

  const dailyValues: number[] = [];
  const chartPoints: ActivityThisWeekChartPoint[] = weekDayKeys.map((dayKey, i) => {
    const label = CARDIO_WEEKLY_METRIC_CHART_DAY_LABELS[i] ?? "—";
    if (dayKey > todayDayKey) {
      dailyValues.push(0);
      return { dayKey, displayLabel: label, value: 0, isFutureDay: true };
    }
    const row = byDay.get(dayKey);
    if (!row || row.workouts.length === 0) {
      dailyValues.push(0);
      return { dayKey, displayLabel: label, value: 0, isFutureDay: false };
    }
    const sessions = reconcileWorkoutSessionsForDay(row.day, row.workouts);
    const minutes = dailyCardioDurationMinutes(sessions, overridesByWorkoutId, durableTitlesByWorkoutId);
    dailyValues.push(minutes);
    return { dayKey, displayLabel: label, value: minutes, isFutureDay: false };
  });

  const total = dailyValues.reduce((acc, v) => acc + v, 0);
  const peakDaily = dailyValues.reduce((m, v) => (v > m ? v : m), 0);
  // Round up scale to nearest 5 minutes so axes don't jitter under small values.
  const chartMaxScale = roundUpToStep(Math.max(peakDaily, 5), 5);

  return {
    totalLabel: formatMinutesTotalLabel(total),
    totalNumeric: total,
    isEmpty: total <= 0,
    chartPoints,
    chartMaxScale,
  };
}
