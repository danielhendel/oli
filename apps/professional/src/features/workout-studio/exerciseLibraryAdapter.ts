/**
 * Thin adapter over the consumer app bundled exercise library.
 *
 * Reused (pure metadata only):
 * - lib/workouts/exercises/library.v1.ts — EXERCISE_LIBRARY_V1
 * - lib/workouts/exercises/catalog.ts — picker eligibility filter
 *
 * Not reused:
 * - React Native picker UI (app/(app)/workouts/exercise-picker.tsx)
 * - AsyncStorage custom exercise store
 * - Exercise media / intelligence scoring (mobile-only concerns)
 */
import { isBundledExerciseSelectableInPickerStatus } from "@oli/lib/workouts/exercises/catalog";
import { EXERCISE_LIBRARY_V1 } from "@oli/lib/workouts/exercises/library.v1";

export const WORKOUT_LIBRARY_FILTERS = [
  "all",
  "push",
  "pull",
  "legs",
  "core",
  "shoulders",
  "arms",
  "chest",
  "back",
] as const;

export type WorkoutLibraryFilter = (typeof WORKOUT_LIBRARY_FILTERS)[number];

export const WORKOUT_LIBRARY_FILTER_LABELS: Record<WorkoutLibraryFilter, string> = {
  all: "All",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  shoulders: "Shoulders",
  arms: "Arms",
  chest: "Chest",
  back: "Back",
};

export type WorkoutLibraryExercise = {
  exerciseId: string;
  name: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  movementPattern: string;
  primaryBucket: string;
  trainingType: string;
  description: string;
  cues: string[];
};

function mapLibraryItem(
  item: (typeof EXERCISE_LIBRARY_V1)[number],
): WorkoutLibraryExercise {
  return {
    exerciseId: item.exerciseId,
    name: item.name,
    aliases: item.aliases,
    primaryMuscles: item.primaryCoarse,
    secondaryMuscles: item.secondaryCoarse,
    equipment: item.equipment,
    movementPattern: item.movement,
    primaryBucket: item.primaryBucket,
    trainingType: item.trainingType,
    description: item.description ?? "",
    cues: item.cues ?? [],
  };
}

/** Active bundled exercises from EXERCISE_LIBRARY_V1 (same filter as mobile picker). */
export function listCanonicalWorkoutLibraryExercises(): WorkoutLibraryExercise[] {
  return EXERCISE_LIBRARY_V1.filter((item) =>
    isBundledExerciseSelectableInPickerStatus(item.status),
  ).map(mapLibraryItem);
}

function matchesFilter(item: WorkoutLibraryExercise, filter: WorkoutLibraryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "push") return item.movementPattern === "push";
  if (filter === "pull") return item.movementPattern === "pull";
  if (filter === "legs") {
    return (
      item.primaryBucket === "Legs" ||
      item.movementPattern === "squat" ||
      item.movementPattern === "hinge" ||
      item.movementPattern === "lunge" ||
      item.movementPattern === "gait"
    );
  }
  if (filter === "core") {
    return item.primaryBucket === "Core" || item.movementPattern === "core";
  }
  if (filter === "shoulders") return item.primaryBucket === "Shoulders";
  if (filter === "arms") {
    return item.primaryBucket === "Biceps" || item.primaryBucket === "Triceps";
  }
  if (filter === "chest") return item.primaryBucket === "Chest";
  if (filter === "back") return item.primaryBucket === "Back";
  return true;
}

function matchesSearch(item: WorkoutLibraryExercise, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.name,
    item.exerciseId,
    item.equipment,
    item.movementPattern,
    item.primaryBucket,
    ...item.aliases,
    ...item.primaryMuscles,
    ...item.secondaryMuscles,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterWorkoutLibraryExercises(
  items: readonly WorkoutLibraryExercise[],
  filter: WorkoutLibraryFilter,
  searchQuery: string,
): WorkoutLibraryExercise[] {
  return items.filter(
    (item) => matchesFilter(item, filter) && matchesSearch(item, searchQuery),
  );
}
