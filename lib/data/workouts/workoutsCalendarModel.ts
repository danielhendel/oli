import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { reconcileWorkoutSessionsForDay, type ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";

/**
 * Shared workout calendar view-model: sorting and recent selection.
 * Single path: RawEvent → WorkoutHistoryItem → grouped days → recent list.
 */

export type WorkoutCalendarDayLike = {
  day: DayKey;
  workouts: WorkoutHistoryItem[];
};

/** ISO-ish timestamp used for ordering (start preferred, else observedAt). */
export function workoutDisplaySortKey(w: WorkoutHistoryItem): string {
  return w.start ?? w.observedAt;
}

/**
 * Chronological ascending within a day: earliest first.
 * Tie-break: id for stability.
 */
export function compareWorkoutsChronologicalAsc(a: WorkoutHistoryItem, b: WorkoutHistoryItem): number {
  const ka = workoutDisplaySortKey(a);
  const kb = workoutDisplaySortKey(b);
  if (!ka && !kb) return a.id.localeCompare(b.id);
  if (!ka) return -1;
  if (!kb) return 1;
  const t = ka.localeCompare(kb);
  if (t !== 0) return t;
  return a.id.localeCompare(b.id);
}

export function sortWorkoutsChronologicalAsc(items: WorkoutHistoryItem[]): WorkoutHistoryItem[] {
  return [...items].sort(compareWorkoutsChronologicalAsc);
}

export type RecentWorkoutEntry = { day: DayKey; workout: WorkoutHistoryItem };
export type RecentWorkoutSessionEntry = { day: DayKey; session: ReconciledWorkoutSession };

/**
 * Newest-first across days, max `maxCount`. Uses same sort keys as day lists.
 */
export function getRecentWorkoutsFromCalendarDays(
  days: WorkoutCalendarDayLike[],
  maxCount = 5,
): RecentWorkoutEntry[] {
  const entries: RecentWorkoutEntry[] = [];
  for (const d of days) {
    for (const w of d.workouts) {
      entries.push({ day: d.day, workout: w });
    }
  }
  entries.sort((a, b) => {
    const ka = workoutDisplaySortKey(a.workout);
    const kb = workoutDisplaySortKey(b.workout);
    if (!ka && !kb) return a.workout.id.localeCompare(b.workout.id);
    if (!ka) return 1;
    if (!kb) return -1;
    const t = kb.localeCompare(ka);
    if (t !== 0) return t;
    return a.workout.id.localeCompare(b.workout.id);
  });
  return entries.slice(0, maxCount);
}

export function getRecentWorkoutSessionsFromCalendarDays(
  days: WorkoutCalendarDayLike[],
  maxCount = 7,
): RecentWorkoutSessionEntry[] {
  const entries: RecentWorkoutSessionEntry[] = [];
  for (const d of days) {
    const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
    for (const session of sessions) entries.push({ day: d.day, session });
  }
  entries.sort((a, b) => {
    const ka = a.session.start ?? a.session.workouts[0]?.observedAt ?? "";
    const kb = b.session.start ?? b.session.workouts[0]?.observedAt ?? "";
    if (!ka && !kb) return a.session.id.localeCompare(b.session.id);
    if (!ka) return 1;
    if (!kb) return -1;
    const t = kb.localeCompare(ka);
    if (t !== 0) return t;
    return a.session.id.localeCompare(b.session.id);
  });
  return entries.slice(0, maxCount);
}
