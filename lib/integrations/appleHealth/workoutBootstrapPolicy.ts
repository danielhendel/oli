/**
 * Historical workout range bootstrap policy (iOS).
 *
 * Deep-backfill version alone is insufficient: once it matches, incremental anchored
 * sync never re-runs a bounded date-range pull, so older HealthKit rows are never seen.
 * This build id gates a one-time (per bump) HK date-range bootstrap independent of anchor.
 */

/** Bump when we need all iOS clients to re-run HealthKit range bootstrap. */
export const WORKOUT_RANGE_BOOTSTRAP_BUILD_ID = "oli-wb-v3-2026-03-22-distance";

export function shouldRequestHistoricalBootstrapRange(args: {
  platformOs: string;
  needsDeepBackfill: boolean;
  storedRangeBootstrapBuildId: string | null;
}): boolean {
  if (args.platformOs !== "ios") return false;
  if (args.needsDeepBackfill) return true;
  return args.storedRangeBootstrapBuildId !== WORKOUT_RANGE_BOOTSTRAP_BUILD_ID;
}
