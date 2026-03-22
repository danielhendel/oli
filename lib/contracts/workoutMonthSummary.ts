/** Written to Firestore `workoutMonthSummaries` and validated on read (API + client). */
export const WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION = 1 as const;

/** Bump when Overview reconciliation / strict tab rules diverge from writer. */
export const WORKOUT_MONTH_SUMMARY_RECONCILE_VERSION = "1";

export const WORKOUT_MONTH_SUMMARY_EXPECTED = {
  schemaVersion: WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION,
  reconcileVersion: WORKOUT_MONTH_SUMMARY_RECONCILE_VERSION,
} as const;
