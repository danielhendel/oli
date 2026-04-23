/**
 * Written to Firestore `workoutMonthSummaries` and validated on read (API + client).
 *
 * Changelog:
 * - v2 / reconcile "2": optional `strengthTaxonomy` month rollup (same resolver as day summaries / weekly card)
 */
export const WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION = 2 as const;

/** Bump when Overview reconciliation / strict tab rules diverge from writer. */
export const WORKOUT_MONTH_SUMMARY_RECONCILE_VERSION = "2";

export const WORKOUT_MONTH_SUMMARY_EXPECTED = {
  schemaVersion: WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION,
  reconcileVersion: WORKOUT_MONTH_SUMMARY_RECONCILE_VERSION,
} as const;

/** Legacy v1 rows remain readable until month rebuild. */
export function isAcceptedWorkoutMonthSummaryRow(row: {
  schemaVersion: number;
  reconcileVersion: string;
}): boolean {
  return (
    (row.schemaVersion === 1 && row.reconcileVersion === "1") ||
    (row.schemaVersion === 2 && row.reconcileVersion === "2")
  );
}
