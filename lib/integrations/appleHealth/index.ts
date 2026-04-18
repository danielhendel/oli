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
  getLocalCalendarDayBoundsFromYmd,
  addLocalCalendarDaysToDayKey,
  pullStepCountForLocalCalendarDay,
  buildHealthKitGetStepCountOptions,
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
export {
  runAppleHealthStepsBackfill,
  APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS,
  type RunAppleHealthStepsBackfillDeps,
  type RunAppleHealthStepsBackfillResult,
} from "./runAppleHealthStepsBackfill";
export type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";
