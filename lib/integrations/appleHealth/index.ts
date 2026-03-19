/**
 * Apple Health (HealthKit) W1 integration.
 * Permission request on explicit action; manual sync; deterministic idempotency keys.
 */

export { requestPermissions, pullTodaySnapshot, pullAnchoredWorkouts } from "./healthKit";
export {
  runWorkoutHistoryBackfillPasses,
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
} from "./runWorkoutHistoryBackfill";
export type { RunWorkoutHistoryBackfillResult } from "./runWorkoutHistoryBackfill";
export {
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  restingHeartRateIdempotencyKey,
  appleExerciseTimeIdempotencyKey,
  activeEnergyIdempotencyKey,
} from "./idempotency";
export type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";
