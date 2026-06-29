import type { MuscleGroup } from "@oli/lib/workouts/exercises/taxonomy";

import type {
  WorkoutProjectedVolume,
  WorkoutProjectedVolumeContributor,
} from "./buildWorkoutProjectedVolume";

export type ProjectedVolumeMuscleDetailExercise = {
  exerciseId?: string;
  exerciseName: string;
  blockId: string;
  blockTitle: string;
  sets: number;
};

export type ProjectedVolumeMuscleDetailBlock = {
  blockId: string;
  blockTitle: string;
  sets: number;
};

export type ProjectedVolumeMuscleDetail = {
  muscleGroup: string;
  muscleGroupKey: MuscleGroup;
  totalSets: number;
  exercises: ProjectedVolumeMuscleDetailExercise[];
  blocks: ProjectedVolumeMuscleDetailBlock[];
};

function aggregateBlocks(
  contributors: WorkoutProjectedVolumeContributor[],
): ProjectedVolumeMuscleDetailBlock[] {
  const byBlock = new Map<string, ProjectedVolumeMuscleDetailBlock>();

  for (const row of contributors) {
    const existing = byBlock.get(row.blockId);
    if (existing) {
      existing.sets += row.sets;
      continue;
    }
    byBlock.set(row.blockId, {
      blockId: row.blockId,
      blockTitle: row.blockTitle,
      sets: row.sets,
    });
  }

  return [...byBlock.values()].sort((a, b) => {
    if (b.sets !== a.sets) return b.sets - a.sets;
    return a.blockTitle.localeCompare(b.blockTitle);
  });
}

/** Deterministic muscle-group detail model for projected volume popup. */
export function buildProjectedVolumeMuscleDetail(
  volume: WorkoutProjectedVolume,
  muscleGroupKey: MuscleGroup,
): ProjectedVolumeMuscleDetail | null {
  const row = volume.muscleGroupSetCounts.find((item) => item.muscleGroupKey === muscleGroupKey);
  if (!row) return null;

  const contributors = volume.contributors.filter((item) => item.muscleGroupKey === muscleGroupKey);

  return {
    muscleGroup: row.muscleGroup,
    muscleGroupKey,
    totalSets: row.sets,
    exercises: contributors.map((item) => ({
      exerciseId: item.exerciseId,
      exerciseName: item.exerciseName,
      blockId: item.blockId,
      blockTitle: item.blockTitle,
      sets: item.sets,
    })),
    blocks: aggregateBlocks(contributors),
  };
}
