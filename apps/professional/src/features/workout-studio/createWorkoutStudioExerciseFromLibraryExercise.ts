import { createId } from "./ids";
import type { WorkoutLibraryExercise } from "./exerciseLibraryAdapter";
import {
  createDefaultCustomExerciseDetails,
  createDefaultExerciseDetails,
  defaultLoggingSchema,
  defaultPrescription,
} from "./exerciseDefaults";
import type { WorkoutExerciseCard } from "./types";

export function createWorkoutStudioExerciseFromLibraryExercise(
  libraryExercise: WorkoutLibraryExercise,
): WorkoutExerciseCard {
  const details = createDefaultExerciseDetails(libraryExercise);

  return {
    id: createId("ex"),
    exerciseId: libraryExercise.exerciseId,
    source: "canonical",
    exerciseName: libraryExercise.name,
    primaryMuscles: [...libraryExercise.primaryMuscles],
    secondaryMuscles: [...libraryExercise.secondaryMuscles],
    equipment: [libraryExercise.equipment],
    movementPattern: libraryExercise.movementPattern,
    designedSets: details.designedSets,
    design: details.design,
    prescription: defaultPrescription(),
    logging: defaultLoggingSchema(libraryExercise.exerciseId),
    progressionRules: details.progressionRules,
    regressionOptions: details.regressionOptions,
    substitutionOptions: details.substitutionOptions,
    mediaComposer: details.mediaComposer,
  };
}

export function createEmptyCustomExercise(name = "Custom Exercise"): WorkoutExerciseCard {
  const details = createDefaultCustomExerciseDetails();

  return {
    id: createId("ex"),
    exerciseId: null,
    source: "custom",
    exerciseName: name,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    movementPattern: null,
    designedSets: details.designedSets,
    design: details.design,
    prescription: defaultPrescription(),
    logging: defaultLoggingSchema(null),
    progressionRules: details.progressionRules,
    regressionOptions: details.regressionOptions,
    substitutionOptions: details.substitutionOptions,
    mediaComposer: details.mediaComposer,
  };
}
