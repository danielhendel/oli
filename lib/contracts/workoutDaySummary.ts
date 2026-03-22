/** Written to Firestore `workoutDaySummaries` and validated on read (API + client). */
export const WORKOUT_DAY_SUMMARY_SCHEMA_VERSION = 1 as const;

/** Bump when server/client reconciliation rules for markers diverge. */
export const WORKOUT_DAY_SUMMARY_RECONCILE_VERSION = "1";

export const WORKOUT_DAY_SUMMARY_EXPECTED = {
  schemaVersion: WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
  reconcileVersion: WORKOUT_DAY_SUMMARY_RECONCILE_VERSION,
} as const;
