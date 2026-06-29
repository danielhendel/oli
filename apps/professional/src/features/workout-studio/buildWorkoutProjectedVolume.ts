import type { MuscleGroup } from "@oli/lib/workouts/exercises/taxonomy";

import { getBlockDisplayTitle, mapStudioBlockTypeToJournalBlockType } from "./blockUtils";
import {
  formatMuscleGroupLabel,
  resolvePrimaryMuscleGroupForStudioExercise,
} from "./muscleGroupAdapter";
import type { WorkoutExperience } from "./types";

export type WorkoutProjectedVolumeMuscleRow = {
  muscleGroup: string;
  muscleGroupKey: MuscleGroup;
  sets: number;
  source: "primary";
};

export type WorkoutProjectedVolumeContributor = {
  muscleGroup: string;
  muscleGroupKey: MuscleGroup;
  exerciseId?: string;
  exerciseName: string;
  blockId: string;
  blockTitle: string;
  sets: number;
};

export type WorkoutProjectedVolumeUncountedExercise = {
  exerciseId?: string;
  exerciseName: string;
  reason: string;
};

export type WorkoutProjectedVolume = {
  /** All designed sets in strength blocks (projected authored sets). */
  totalSets: number;
  /** Designed sets with RPE 7–10 or no RPE target (working-set estimate). */
  estimatedWorkingSets: number;
  muscleGroupSetCounts: WorkoutProjectedVolumeMuscleRow[];
  highestVolumeMuscleGroup: { muscleGroup: string; muscleGroupKey: MuscleGroup; sets: number } | null;
  muscleGroupsTrained: number;
  countedExercises: number;
  uncountedExercises: WorkoutProjectedVolumeUncountedExercise[];
  /** Per-exercise/block attribution for muscle-group detail views. */
  contributors: WorkoutProjectedVolumeContributor[];
};

function isProjectedVolumeStrengthBlock(blockType: WorkoutExperience["blocks"][number]["blockType"]): boolean {
  const journalType = mapStudioBlockTypeToJournalBlockType(blockType);
  return journalType === "sets" || journalType === "superset" || journalType === "circuit";
}

function isEstimatedWorkingSet(rpeTarget: number | null): boolean {
  if (rpeTarget == null) return true;
  return rpeTarget >= 7 && rpeTarget <= 10;
}

function sortMuscleRows(
  rows: WorkoutProjectedVolumeMuscleRow[],
): WorkoutProjectedVolumeMuscleRow[] {
  return [...rows].sort((a, b) => {
    if (b.sets !== a.sets) return b.sets - a.sets;
    return a.muscleGroup.localeCompare(b.muscleGroup);
  });
}

function sortContributors(
  rows: WorkoutProjectedVolumeContributor[],
): WorkoutProjectedVolumeContributor[] {
  return [...rows].sort((a, b) => {
    if (b.sets !== a.sets) return b.sets - a.sets;
    if (a.blockTitle !== b.blockTitle) return a.blockTitle.localeCompare(b.blockTitle);
    return a.exerciseName.localeCompare(b.exerciseName);
  });
}

/**
 * Draft projected set volume for an authored workout.
 *
 * Rules (aligned with mobile taxonomy set rollups):
 * - Count designedSets.length per exercise in strength blocks (sets/superset/circuit journal types)
 * - Exclude warmup, cooldown, and cardio blocks
 * - Attribute full set credit to primary muscle only (no secondary split)
 * - Does not compute load-volume or hypertrophy stimulus
 */
export function buildWorkoutProjectedVolume(workout: WorkoutExperience): WorkoutProjectedVolume {
  const muscleSets = new Map<MuscleGroup, number>();
  const contributors: WorkoutProjectedVolumeContributor[] = [];
  const uncountedExercises: WorkoutProjectedVolumeUncountedExercise[] = [];
  let totalSets = 0;
  let estimatedWorkingSets = 0;
  let countedExercises = 0;

  for (const block of workout.blocks) {
    if (!isProjectedVolumeStrengthBlock(block.blockType)) continue;

    const blockTitle = getBlockDisplayTitle(block);

    for (const exercise of block.exercises) {
      const setCount = exercise.designedSets.length;
      if (setCount === 0) continue;

      totalSets += setCount;
      estimatedWorkingSets += exercise.designedSets.filter((set) =>
        isEstimatedWorkingSet(set.rpeTarget),
      ).length;

      const primary = resolvePrimaryMuscleGroupForStudioExercise(exercise);
      if (primary == null) {
        uncountedExercises.push({
          exerciseId: exercise.exerciseId ?? undefined,
          exerciseName: exercise.exerciseName || "Unnamed exercise",
          reason: "No primary muscle group could be resolved",
        });
        continue;
      }

      countedExercises += 1;
      muscleSets.set(primary, (muscleSets.get(primary) ?? 0) + setCount);
      contributors.push({
        muscleGroup: formatMuscleGroupLabel(primary),
        muscleGroupKey: primary,
        exerciseId: exercise.exerciseId ?? undefined,
        exerciseName: exercise.exerciseName || "Unnamed exercise",
        blockId: block.id,
        blockTitle,
        sets: setCount,
      });
    }
  }

  const muscleGroupSetCounts = sortMuscleRows(
    [...muscleSets.entries()].map(([muscleGroupKey, sets]) => ({
      muscleGroup: formatMuscleGroupLabel(muscleGroupKey),
      muscleGroupKey,
      sets,
      source: "primary" as const,
    })),
  );

  const highest = muscleGroupSetCounts[0] ?? null;

  return {
    totalSets,
    estimatedWorkingSets,
    muscleGroupSetCounts,
    highestVolumeMuscleGroup: highest
      ? {
          muscleGroup: highest.muscleGroup,
          muscleGroupKey: highest.muscleGroupKey,
          sets: highest.sets,
        }
      : null,
    muscleGroupsTrained: muscleGroupSetCounts.length,
    countedExercises,
    uncountedExercises,
    contributors: sortContributors(contributors),
  };
}
