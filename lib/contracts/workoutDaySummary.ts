/**
 * Written to Firestore `workoutDaySummaries` and validated on read (API + client).
 *
 * Changelog:
 * - v1 / reconcile "1": hasStrength, hasCardio, rawWorkoutCount
 * - v2 / reconcile "2": adds strengthSessionCount & cardioSessionCount (overview-tab session counts;
 *   same rules as Strength/Cardio overview tabs in lib/data/workouts/workoutsCalendarModel.ts)
 */
export const WORKOUT_DAY_SUMMARY_SCHEMA_VERSION = 2 as const;

/** Bump when server/client reconciliation rules for markers or tab counts diverge. */
export const WORKOUT_DAY_SUMMARY_RECONCILE_VERSION = "2";

export const WORKOUT_DAY_SUMMARY_EXPECTED = {
  schemaVersion: WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
  reconcileVersion: WORKOUT_DAY_SUMMARY_RECONCILE_VERSION,
} as const;
