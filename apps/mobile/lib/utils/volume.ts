// File: apps/mobile/lib/utils/volume.ts
import { ExerciseEntry } from '@/types/workout';

/**
 * Compute total volume (kg) for a single exercise
 */
export function computeExerciseVolumeKg(ex: ExerciseEntry): number {
  return ex.sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight ?? 0), 0);
}

/**
 * Compute total workout volume (kg) across all sections and exercises
 */
export function computeWorkoutVolumeKg(
  sections: Array<{ exercises: ExerciseEntry[] }>
): number {
  return sections.reduce(
    (acc, sec) =>
      acc + sec.exercises.reduce((sum, ex) => sum + computeExerciseVolumeKg(ex), 0),
    0
  );
}
