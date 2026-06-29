import { getBlockDisplayTitle } from "./blockUtils";
import type { WorkoutExerciseCard, WorkoutExperience, WorkoutExperiencePreview } from "./types";

function buildPreviewExercise(exercise: WorkoutExerciseCard) {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    name: exercise.exerciseName || "Unnamed exercise",
    designedSets: exercise.designedSets.map((set) => ({ ...set })),
    whyThisExercise: exercise.design.whyThisExercise,
    whyToday: exercise.design.whyToday,
    what: exercise.exerciseName || "Movement",
    why: exercise.design.whyThisExercise,
    how: exercise.design.executionInstructions || exercise.design.setupInstructions,
    cues: exercise.design.coachingCues.map((cue) => cue.text).filter(Boolean),
    shouldFeel: exercise.design.shouldFeel.map((item) => item.text).filter(Boolean),
    shouldNotFeel: exercise.design.shouldNotFeel.map((item) => item.text).filter(Boolean),
    commonMistakes: exercise.design.commonMistakes.map((item) => item.text).filter(Boolean),
    progressionRules: exercise.progressionRules.map((item) => item.text).filter(Boolean),
    loggingFields: exercise.logging.fields.filter((field) => field.enabled),
    educationNotes: exercise.design.educationNotes,
  };
}

export function buildWorkoutExperiencePreview(
  workout: WorkoutExperience,
): WorkoutExperiencePreview {
  return {
    id: workout.id,
    title: workout.title,
    clientName: workout.clientName,
    objective: workout.overview.objective,
    desiredAdaptation: workout.overview.desiredAdaptation,
    roleInHealthSystem: workout.overview.roleInHealthSystem,
    estimatedDurationMinutes: workout.estimatedDurationMinutes,
    difficulty: workout.difficulty,
    blocks: workout.blocks.map((block) => ({
      id: block.id,
      blockType: block.blockType,
      title: getBlockDisplayTitle(block),
      notes: block.notes,
      exercises: block.exercises.map(buildPreviewExercise),
    })),
  };
}

/** @deprecated — use buildWorkoutExperiencePreview */
export const buildWorkoutPreview = buildWorkoutExperiencePreview;
