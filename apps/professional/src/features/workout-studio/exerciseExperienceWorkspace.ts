import { getBlockDisplayTitle } from "./blockUtils";
import type { WorkoutBlock, WorkoutExerciseCard, WorkoutExperience } from "./types";

export type ExerciseExperienceRef = {
  blockId: string;
  exerciseCardId: string;
};

export type ExerciseExperienceContext = {
  exercise: WorkoutExerciseCard;
  block: WorkoutBlock;
  blockTitle: string;
};

export function openExerciseExperience(ref: ExerciseExperienceRef): ExerciseExperienceRef {
  return { ...ref };
}

export function closeExerciseExperience(): null {
  return null;
}

export function resolveExerciseExperienceContext(
  workout: WorkoutExperience,
  ref: ExerciseExperienceRef | null,
): ExerciseExperienceContext | null {
  if (!ref) return null;

  const block = workout.blocks.find((item) => item.id === ref.blockId);
  if (!block) return null;

  const exercise = block.exercises.find((item) => item.id === ref.exerciseCardId);
  if (!exercise) return null;

  return {
    exercise,
    block,
    blockTitle: getBlockDisplayTitle(block),
  };
}
