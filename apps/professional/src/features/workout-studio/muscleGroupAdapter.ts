/**
 * Temporary adapter — maps canonical exercise metadata to app-aligned MuscleGroup labels.
 *
 * Reuses taxonomy types from the consumer app. Should be replaced by a shared package
 * when exercise analytics utilities are extracted for cross-app use.
 *
 * Set counting mirrors mobile taxonomy rollups:
 * - full set credit to primary muscle only (see strengthTaxonomySummaryAggregate)
 * - secondary muscles are NOT counted for set volume
 */
import { getPrimaryMuscleGroupForExercise } from "@oli/lib/workouts/exercises/muscleContributions";
import type { MuscleGroup, MuscleGroupCoarse } from "@oli/lib/workouts/exercises/taxonomy";

import type { WorkoutExerciseCard } from "./types";

/** App analytics MuscleGroup → display label (matches mobile dashboard copy). */
export const MUSCLE_GROUP_DISPLAY_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

/** Mirrors `primaryMuscleGroupFromCoarseFirst` in exerciseAnalyticsIntelligence.ts */
export function mapMuscleGroupCoarseToMuscleGroup(
  coarse: MuscleGroupCoarse | string | undefined,
): MuscleGroup | null {
  switch (coarse) {
    case "Chest":
      return "chest";
    case "Back":
      return "back";
    case "Shoulders":
      return "shoulders";
    case "Biceps":
      return "biceps";
    case "Triceps":
      return "triceps";
    case "Forearms":
      return "forearms";
    case "Core":
      return "core";
    case "Quads":
      return "quads";
    case "Hamstrings":
      return "hamstrings";
    case "Glutes":
      return "glutes";
    case "Calves":
      return "calves";
    case "Hips":
      return "glutes";
    case "Legs":
      return "quads";
    default:
      return null;
  }
}

export function formatMuscleGroupLabel(group: MuscleGroup): string {
  return MUSCLE_GROUP_DISPLAY_LABELS[group];
}

/**
 * Resolves the primary analytics muscle group for a studio exercise card.
 * Canonical exercises use contribution maps via getPrimaryMuscleGroupForExercise.
 */
export function resolvePrimaryMuscleGroupForStudioExercise(
  exercise: Pick<WorkoutExerciseCard, "exerciseId" | "source" | "primaryMuscles">,
): MuscleGroup | null {
  if (exercise.exerciseId) {
    const fromCatalog = getPrimaryMuscleGroupForExercise(exercise.exerciseId);
    if (fromCatalog != null) return fromCatalog;
  }

  for (const muscle of exercise.primaryMuscles) {
    const mapped = mapMuscleGroupCoarseToMuscleGroup(muscle);
    if (mapped != null) return mapped;
  }

  return null;
}
