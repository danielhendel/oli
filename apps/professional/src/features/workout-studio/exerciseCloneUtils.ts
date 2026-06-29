import { createId } from "./ids";
import type {
  ExerciseCoachingCue,
  ExerciseCommonMistake,
  ExerciseFeelGuide,
  ExerciseProgressionRule,
  WorkoutBlock,
  WorkoutDesignedSet,
  WorkoutExerciseCard,
} from "./types";

function cloneDesignedSets(sets: WorkoutDesignedSet[]): WorkoutDesignedSet[] {
  return sets.map((set) => ({ ...set, setId: createId("set") }));
}

function cloneCues(cues: ExerciseCoachingCue[]): ExerciseCoachingCue[] {
  return cues.map((cue) => ({ ...cue, id: createId("cue") }));
}

function cloneMistakes(items: ExerciseCommonMistake[]): ExerciseCommonMistake[] {
  return items.map((item) => ({ ...item, id: createId("mistake") }));
}

function cloneFeel(items: ExerciseFeelGuide[]): ExerciseFeelGuide[] {
  return items.map((item) => ({ ...item, id: createId("feel") }));
}

function cloneProgression(rules: ExerciseProgressionRule[]): ExerciseProgressionRule[] {
  return rules.map((rule) => ({ ...rule, id: createId("prog") }));
}

/** Deep-clones an exercise card with new studio instance ids; preserves canonical exerciseId. */
export function cloneExerciseCard(
  exercise: WorkoutExerciseCard,
  options?: { suffix?: string },
): WorkoutExerciseCard {
  const suffix = options?.suffix ?? " (copy)";
  const nextName =
    exercise.exerciseName && !exercise.exerciseName.endsWith(suffix)
      ? `${exercise.exerciseName}${suffix}`
      : exercise.exerciseName;

  return {
    ...exercise,
    id: createId("ex"),
    exerciseId: exercise.exerciseId,
    exerciseName: nextName,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: [...exercise.equipment],
    designedSets: cloneDesignedSets(exercise.designedSets),
    design: {
      ...exercise.design,
      coachingCues: cloneCues(exercise.design.coachingCues),
      commonMistakes: cloneMistakes(exercise.design.commonMistakes),
      shouldFeel: cloneFeel(exercise.design.shouldFeel),
      shouldNotFeel: cloneFeel(exercise.design.shouldNotFeel),
    },
    prescription: { ...exercise.prescription },
    logging: {
      fields: exercise.logging.fields.map((field) => ({ ...field })),
    },
    progressionRules: cloneProgression(exercise.progressionRules),
    regressionOptions: [...exercise.regressionOptions],
    substitutionOptions: [...exercise.substitutionOptions],
    mediaComposer: { ...exercise.mediaComposer, enabledSlots: [...exercise.mediaComposer.enabledSlots] },
  };
}

/** Deep-clones a block with new ids and cloned exercises. */
export function cloneWorkoutBlock(block: WorkoutBlock, order: number): WorkoutBlock {
  const customTitle =
    block.blockType === "custom" && block.customTitle.trim()
      ? `${block.customTitle.trim()} (copy)`
      : block.customTitle;

  return {
    id: createId("blk"),
    blockType: block.blockType,
    customTitle,
    notes: block.notes,
    order,
    exercises: block.exercises.map((exercise) => cloneExerciseCard(exercise, { suffix: "" })),
  };
}
