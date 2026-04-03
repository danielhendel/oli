/**
 * Apple Health (HealthKit) W1 integration.
 * Permission request on explicit action; manual sync; deterministic idempotency keys.
 */

export {
  requestPermissions,
  getBodyCompositionReadAuthStatus,
  pullTodaySnapshot,
  pullAnchoredWorkouts,
  pullWorkoutsByDateRange,
  pullBodyCompositionSamples,
  buildAppleHealthBodyMassSampleQueryOptions,
  toHealthKitIso8601,
} from "./healthKit";
export type { BodyCompositionReadAuthStatusResult } from "./healthKit";
export {
  runWorkoutHistoryBackfillPasses,
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
} from "./runWorkoutHistoryBackfill";
export type { RunWorkoutHistoryBackfillResult } from "./runWorkoutHistoryBackfill";
export {
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  appleHealthBodyWeightIdempotencyKey,
  appleHealthBodyCompositionIdempotencyKey,
  restingHeartRateIdempotencyKey,
  appleExerciseTimeIdempotencyKey,
  activeEnergyIdempotencyKey,
} from "./idempotency";
export {
  runAppleHealthBodySync,
  type RunAppleHealthBodySyncDeps,
  type RunAppleHealthBodySyncResult,
} from "./runAppleHealthBodySync";
export {
  runAppleHealthBodyBackfill,
  isoYearsAgoFromNow,
  APPLE_HEALTH_BODY_BACKFILL_YEARS,
  APPLE_HEALTH_BODY_BACKFILL_CHUNK_DAYS,
  type RunAppleHealthBodyBackfillDeps,
  type RunAppleHealthBodyBackfillResult,
} from "./runAppleHealthBodyBackfill";
export type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";
