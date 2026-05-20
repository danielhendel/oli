/**
 * Display-only per-workout muscle set volume bands for Workout Details progress bars.
 * Not persisted; conservative thresholds for a single session per primary muscle.
 */

export type WorkoutMuscleSetVolumeRange = "low" | "moderate" | "high" | "very_high";

export const WORKOUT_MUSCLE_SET_VOLUME_RANGE_LABELS: Record<WorkoutMuscleSetVolumeRange, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very High",
};

/** Inclusive upper bounds (sets) for Low / Moderate / High; above highMax is Very High. */
export const WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS = {
  lowMax: 3,
  moderateMax: 6,
  highMax: 10,
} as const;

export function workoutMuscleSetVolumeRangeFromSetCount(setCount: number): WorkoutMuscleSetVolumeRange {
  if (!Number.isFinite(setCount) || setCount <= 0) return "low";
  if (setCount <= WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS.lowMax) return "low";
  if (setCount <= WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS.moderateMax) return "moderate";
  if (setCount <= WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS.highMax) return "high";
  return "very_high";
}

/**
 * Maps set count into 0–1 bar fill using tier bands (Low→25%, Moderate→50%, High→75%, Very High→100%),
 * with linear interpolation inside each band.
 */
export function workoutMuscleSetVolumeRangeProgress01(setCount: number): number {
  if (!Number.isFinite(setCount) || setCount <= 0) return 0;
  const { lowMax, moderateMax, highMax } = WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS;
  if (setCount <= lowMax) return (setCount / lowMax) * 0.25;
  if (setCount <= moderateMax) {
    const span = moderateMax - lowMax;
    return 0.25 + ((setCount - lowMax) / span) * 0.25;
  }
  if (setCount <= highMax) {
    const span = highMax - moderateMax;
    return 0.5 + ((setCount - moderateMax) / span) * 0.25;
  }
  const veryHighSpan = 6;
  const over = Math.min(veryHighSpan, setCount - highMax);
  return 0.75 + (over / veryHighSpan) * 0.25;
}
