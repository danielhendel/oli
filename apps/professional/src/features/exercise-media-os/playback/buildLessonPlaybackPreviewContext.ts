import { isBenchPressProductExercise } from "../bench-press-product/benchPressProductConstants";
import type { WorkoutExerciseCard } from "../../workout-studio/types";

import { resolveLessonPlaybackPlan } from "./buildLessonPlaybackPlan";
import type { LessonPlaybackPlan } from "./types";

export type LessonPlaybackPreviewContext = {
  available: boolean;
  isBenchPress: boolean;
  plan: LessonPlaybackPlan | null;
  statusLabel: string;
  previewLabel: string;
};

export type LessonPlaybackPreviewInput = {
  exercise: WorkoutExerciseCard;
  clientGoal: string;
};

/** Build lesson playback preview context for UI surfaces. */
export function buildLessonPlaybackPreviewContext(
  input: LessonPlaybackPreviewInput,
): LessonPlaybackPreviewContext {
  const { exercise, clientGoal } = input;
  const isBenchPress = isBenchPressProductExercise(exercise.exerciseId);

  const plan = resolveLessonPlaybackPlan({
    exerciseId: exercise.exerciseId ?? "",
    exerciseName: exercise.exerciseName,
    mediaComposer: exercise.mediaComposer,
    clientGoal,
  });

  return {
    available: plan !== null,
    isBenchPress,
    plan,
    statusLabel: isBenchPress ? "Blueprint Complete · Assets Pending" : "Master Package Planned",
    previewLabel: isBenchPress ? "Preview Available" : "Preview when Master Package is ready",
  };
}
