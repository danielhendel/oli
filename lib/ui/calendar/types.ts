import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

/**
 * Shared calendar types.
 *
 * Day keys are canonical YYYY-MM-DD strings.
 */
export type DayKey = string;

export function isValidDayKey(day: string): day is DayKey {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T12:00:00.000Z`));
}

export interface CalendarDay<TMeta = unknown> {
  day: DayKey;
  meta?: TMeta;
}

/**
 * Marker model for workouts calendar.
 *
 * This is intentionally narrow and can be extended or adapted for other modules.
 */
export interface WorkoutDayMarker {
  hasWorkouts: boolean;
  hasStrength: boolean;
  hasCardio: boolean;
  workoutCount: number;
  /**
   * All workouts for this day.
   *
   * This is exposed so that simple callers (like a day-detail screen) can
   * avoid refetching when they already have the per-day grouping.
   */
  workouts: WorkoutHistoryItem[];
}

