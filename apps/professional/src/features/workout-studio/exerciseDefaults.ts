import type { MediaComposerState } from "../exercise-media-os/types";
import { buildDefaultMediaComposerState } from "../exercise-media-os/buildMediaComposerState";
import { buildAcademyBackedExerciseDesignDefaults } from "../exercise-academy/buildExerciseAcademyDesignDefaults";
import type { WorkoutLibraryExercise } from "./exerciseLibraryAdapter";
import type {
  ExerciseDesignFields,
  ExerciseLoggingSchema,
  ExercisePrescriptionFields,
  ExerciseProgressionRule,
} from "./types";
import { LOGGING_FIELD_KINDS } from "./types";
import { createDefaultDesignedSets } from "./designedSetUtils";

export function defaultPrescription(): ExercisePrescriptionFields {
  return {
    sets: 3,
    reps: null,
    repRange: "8-12",
    loadGuidance: "",
    tempo: "",
    restSeconds: 90,
    rirTarget: 2,
    rpeTarget: 8,
    failurePolicy: "Stop 1-2 reps before technical failure unless prescribed.",
  };
}

/**
 * Default logging schema aligned with app journal `strength_set_logged` fields:
 * reps, loadKg (weight), rpe, note — plus studio extensions (rir, pain, etc.).
 */
export function defaultLoggingSchema(exerciseId: string | null): ExerciseLoggingSchema {
  const isBodyweight =
    exerciseId != null &&
    (exerciseId.includes("pull_up") ||
      exerciseId.includes("push_up") ||
      exerciseId.includes("plank"));

  return {
    fields: LOGGING_FIELD_KINDS.map((kind) => ({
      kind,
      enabled:
        kind === "reps" ||
        kind === "setsCompleted" ||
        kind === "rpe" ||
        kind === "rir" ||
        kind === "notes" ||
        (kind === "weight" && !isBodyweight),
    })),
  };
}

export { createDefaultDesignedSets };

type DefaultExerciseDetails = {
  design: ExerciseDesignFields;
  progressionRules: ExerciseProgressionRule[];
  regressionOptions: string[];
  substitutionOptions: string[];
  designedSets: ReturnType<typeof createDefaultDesignedSets>;
  mediaComposer: MediaComposerState;
};

/**
 * Generates editable starter coaching content from Exercise Academy entry.
 * Academy provides the reusable teaching foundation; professional edits stay local.
 */
export function createDefaultExerciseDetails(
  libraryExercise: WorkoutLibraryExercise,
): DefaultExerciseDetails {
  const academyDefaults = buildAcademyBackedExerciseDesignDefaults(libraryExercise);

  return {
    designedSets: createDefaultDesignedSets(3),
    design: {
      ...academyDefaults.design,
      whyToday: "",
      coachingIntent: "",
      mediaNotes: "",
    },
    progressionRules: academyDefaults.progressionRules,
    regressionOptions: academyDefaults.regressionOptions,
    substitutionOptions: academyDefaults.substitutionOptions,
    mediaComposer: buildDefaultMediaComposerState(libraryExercise.exerciseId),
  };
}

export function createDefaultCustomExerciseDetails(): DefaultExerciseDetails {
  return {
    designedSets: createDefaultDesignedSets(3),
    design: {
      whyThisExercise: "",
      whyToday: "",
      coachingIntent: "",
      setupInstructions: "",
      executionInstructions: "",
      coachingCues: [],
      commonMistakes: [],
      shouldFeel: [],
      shouldNotFeel: [],
      educationNotes: "",
      mediaNotes: "",
    },
    progressionRules: [],
    regressionOptions: [],
    substitutionOptions: [],
    mediaComposer: buildDefaultMediaComposerState("custom-exercise"),
  };
}
