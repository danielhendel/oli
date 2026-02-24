/**
 * Types for Apple Health (HealthKit) W1 integration.
 * Read-only snapshot and permission result shapes.
 */

/** Result of requesting HealthKit permissions (only when called). */
export type HealthKitPermissionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Today snapshot: steps, exercise time, active energy, resting HR, recent workouts. */
export type TodaySnapshot = {
  day: string; // YYYY-MM-DD
  steps: number | null;
  exerciseMinutes: number | null;
  activeEnergyKcal: number | null;
  restingHeartRateBpm: number | null;
  workouts: TodayWorkout[];
};

export type TodayWorkout = {
  id: string;
  start: string; // ISO
  end: string; // ISO
  activityId: number;
  activityName: string;
  sourceId: string | null;
  durationMinutes: number;
  calories: number;
};
