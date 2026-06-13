// lib/data/program/getProgramExerciseDetails.ts
/**
 * Truthful, library-backed exercise details for the Program Builder exercise selection page.
 * Pure — no IO, no React, no network.
 *
 * Only surfaces fields the EXISTING library actually provides (name, primary/secondary muscles,
 * equipment, movement, logging type, and description ONLY when the library row has one). It never
 * invents descriptions/instructions and never fabricates exercises. Custom (user-created) records
 * are supported via their own optional taxonomy.
 */
import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import { resolveStrengthLoggingType } from "@/lib/workouts/exercises/loggingType";
import type { MovementPattern } from "@/lib/workouts/exercises/metadata";
import type { Equipment, MuscleGroupDetailed } from "@/lib/workouts/exercises/taxonomy";
import { getBundledLibraryItemByExerciseId } from "@/lib/workouts/exercises/taxonomyResolve";

export interface ProgramExerciseDetails {
  exerciseId: string;
  name: string;
  /** Human-readable primary muscles (from the library's detailed tags). */
  primaryMuscles: string[];
  /** Human-readable secondary muscles, when the library provides them. */
  secondaryMuscles: string[];
  equipment: Equipment | null;
  movement: MovementPattern | null;
  loggingType: string;
  /** Library-authored description; undefined when the row has none (never fabricated). */
  description: string | undefined;
  origin: "bundled" | "custom" | "unknown";
}

/** Split a PascalCase detailed-muscle tag into words, e.g. "UpperPecs" → "Upper Pecs". */
function formatDetailedMuscle(tag: MuscleGroupDetailed): string {
  return tag.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function loggingTypeLabel(loggingType: string): string {
  switch (loggingType) {
    case "weight_reps":
      return "Weight & reps";
    case "bodyweight_reps":
      return "Bodyweight reps";
    case "reps_only":
      return "Reps only";
    default:
      return loggingType;
  }
}

/**
 * Resolve truthful details for an exercise id. Checks the bundled library first, then any injected
 * custom record. Returns a safe minimal shape for unknown ids (no fabricated fields).
 */
export function getProgramExerciseDetails(
  exerciseId: string,
  customExercises: readonly CustomExerciseRecord[] = [],
): ProgramExerciseDetails {
  const bundled = getBundledLibraryItemByExerciseId(exerciseId);
  if (bundled != null) {
    return {
      exerciseId,
      name: bundled.name,
      primaryMuscles: bundled.primaryDetailed.map(formatDetailedMuscle),
      secondaryMuscles: bundled.secondaryDetailed.map(formatDetailedMuscle),
      equipment: bundled.equipment,
      movement: bundled.movement,
      loggingType: loggingTypeLabel(resolveStrengthLoggingType(exerciseId)),
      description: bundled.description,
      origin: "bundled",
    };
  }

  const custom = customExercises.find((record) => record.exerciseId === exerciseId);
  if (custom != null) {
    return {
      exerciseId,
      name: custom.name,
      primaryMuscles: (custom.primaryMusclesDetailed ?? []).map(formatDetailedMuscle),
      secondaryMuscles: (custom.secondaryMusclesDetailed ?? []).map(formatDetailedMuscle),
      equipment: custom.equipment,
      movement: custom.movementPattern ?? null,
      loggingType: loggingTypeLabel(resolveStrengthLoggingType(exerciseId, custom.loggingType)),
      description: undefined,
      origin: "custom",
    };
  }

  return {
    exerciseId,
    name: exerciseId,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: null,
    movement: null,
    loggingType: loggingTypeLabel("weight_reps"),
    description: undefined,
    origin: "unknown",
  };
}
