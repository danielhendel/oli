/**
 * Written to Firestore `workoutDaySummaries` and validated on read (API + client).
 *
 * Changelog:
 * - v1 / reconcile "1": hasStrength, hasCardio, rawWorkoutCount
 * - v2 / reconcile "2": adds strengthSessionCount & cardioSessionCount (overview-tab session counts;
 *   same rules as Strength/Cardio overview tabs in lib/data/workouts/workoutsCalendarModel.ts)
 * - v3 / reconcile "3": optional `strengthTaxonomy` aggregates (exerciseId-first resolution from raw strength payloads)
 */
export const WORKOUT_DAY_SUMMARY_SCHEMA_VERSION = 3 as const;

/** Bump when server/client reconciliation rules for markers or tab counts diverge. */
export const WORKOUT_DAY_SUMMARY_RECONCILE_VERSION = "3";

export const WORKOUT_DAY_SUMMARY_EXPECTED = {
  schemaVersion: WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
  reconcileVersion: WORKOUT_DAY_SUMMARY_RECONCILE_VERSION,
} as const;

/** Firestore may contain v2 rows until backfill; writers emit v3. */
export function isAcceptedWorkoutDaySummaryRow(row: {
  schemaVersion: number;
  reconcileVersion: string;
}): boolean {
  return (
    (row.schemaVersion === 2 && row.reconcileVersion === "2") ||
    (row.schemaVersion === 3 && row.reconcileVersion === "3")
  );
}
