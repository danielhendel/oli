import {
  buildBiomechanicsFromLibrary,
  buildProgrammingFromLibrary,
  buildTeachingFromLibrary,
  inferSkillLevel,
} from "./exerciseAcademyDefaults";
import { buildExerciseKnowledgeQuality } from "./buildExerciseKnowledgeQuality";
import { buildExerciseMediaPlan } from "./buildExerciseMediaPlan";
import type { WorkoutLibraryExercise } from "../workout-studio/exerciseLibraryAdapter";
import type { ExerciseAcademyEntry } from "./types";
import { EXERCISE_ACADEMY_VERSION } from "./types";

/**
 * Build a deterministic Exercise Academy entry from canonical library metadata.
 * Conservative starter teaching — no medical claims; media slots are planned only.
 */
export function buildExerciseAcademyEntryFromCanonicalExercise(
  exercise: WorkoutLibraryExercise,
): ExerciseAcademyEntry {
  const teaching = buildTeachingFromLibrary(exercise);
  const skillLevel = inferSkillLevel(exercise.trainingType);

  const entryWithoutQuality: Omit<ExerciseAcademyEntry, "quality"> = {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.name,
    source: "canonical",
    version: EXERCISE_ACADEMY_VERSION,
    identity: {
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      aliases: exercise.aliases,
      equipment: exercise.equipment ? [exercise.equipment] : [],
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      movementPattern: exercise.movementPattern,
      difficulty: skillLevel,
      skillLevel,
    },
    biomechanics: buildBiomechanicsFromLibrary(exercise),
    teaching,
    mediaPlan: buildExerciseMediaPlan({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      teaching,
    }),
    programming: buildProgrammingFromLibrary(exercise),
    safety: {
      generalNotes:
        "Prioritize controlled movement and honest range of motion. Scale load before compensating.",
      stopIf: ["Sharp pain", "Dizziness", "Loss of balance or control"],
      scalingNotes: "Reduce load, reps, or range before changing exercise selection.",
    },
    substitutions: {
      regressionOptions: [],
      substitutionOptions: [],
      notes: "Substitutions should preserve similar movement intent and loading profile.",
    },
  };

  const quality = buildExerciseKnowledgeQuality(entryWithoutQuality);

  return {
    ...entryWithoutQuality,
    quality,
  };
}
