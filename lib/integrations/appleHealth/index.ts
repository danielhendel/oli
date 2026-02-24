/**
 * Apple Health (HealthKit) W1 integration.
 * Permission request on explicit action; manual sync; deterministic idempotency keys.
 */

export { requestPermissions, pullTodaySnapshot } from "./healthKit";
export {
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  restingHeartRateIdempotencyKey,
  appleExerciseTimeIdempotencyKey,
  activeEnergyIdempotencyKey,
} from "./idempotency";
export type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";
