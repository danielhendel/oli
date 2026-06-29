import { createId } from "../workout-studio/ids";
import type { WorkoutLibraryExercise } from "../workout-studio/exerciseLibraryAdapter";
import type {
  ExerciseDesignFields,
  ExerciseProgressionRule,
} from "../workout-studio/types";
import { buildExerciseAcademyEntryFromCanonicalExercise } from "./buildExerciseAcademyEntry";
import type { ExerciseAcademyEntry } from "./types";

function toTextItems(values: string[], prefix: "cue" | "mistake" | "feel" | "nofeel" | "prog") {
  return values
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ id: createId(prefix), text }));
}

export function mapAcademyEntryToExerciseDesign(
  entry: ExerciseAcademyEntry,
): Pick<
  ExerciseDesignFields,
  | "whyThisExercise"
  | "setupInstructions"
  | "executionInstructions"
  | "coachingCues"
  | "commonMistakes"
  | "shouldFeel"
  | "shouldNotFeel"
  | "educationNotes"
> {
  const { teaching } = entry;

  return {
    whyThisExercise: teaching.overview,
    setupInstructions: teaching.setup,
    executionInstructions: teaching.execution,
    coachingCues: toTextItems(teaching.coachingCues, "cue"),
    commonMistakes: toTextItems(teaching.commonMistakes, "mistake"),
    shouldFeel: toTextItems(teaching.shouldFeel, "feel"),
    shouldNotFeel: toTextItems(teaching.shouldNotFeel, "nofeel"),
    educationNotes: [teaching.beginnerNotes, teaching.advancedNotes].filter(Boolean).join("\n\n"),
  };
}

export function mapAcademyEntryToProgressionRules(
  entry: ExerciseAcademyEntry,
): ExerciseProgressionRule[] {
  return entry.programming.progressionOptions
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ id: createId("prog"), text }));
}

export function buildAcademyBackedExerciseDesignDefaults(libraryExercise: WorkoutLibraryExercise) {
  const entry = buildExerciseAcademyEntryFromCanonicalExercise(libraryExercise);
  return {
    entry,
    design: mapAcademyEntryToExerciseDesign(entry),
    progressionRules: mapAcademyEntryToProgressionRules(entry),
    regressionOptions: entry.programming.regressionOptions,
    substitutionOptions: entry.substitutions.substitutionOptions,
  };
}
