import { buildExerciseAcademyEntryFromCanonicalExercise } from "./buildExerciseAcademyEntry";
import { buildExerciseLessonModules } from "./buildExerciseLessonModules";
import type { WorkoutLibraryExercise } from "../workout-studio/exerciseLibraryAdapter";
import type {
  ExerciseAcademyEntry,
  ExerciseAcademyPayloadRef,
  ExerciseLessonModule,
} from "./types";

export function getExerciseAcademyEntryForLibraryExercise(
  exercise: WorkoutLibraryExercise,
): ExerciseAcademyEntry {
  return buildExerciseAcademyEntryFromCanonicalExercise(exercise);
}

export function getExerciseAcademyEntryById(
  exerciseId: string,
  libraryExercises: WorkoutLibraryExercise[],
): ExerciseAcademyEntry | null {
  const match = libraryExercises.find((exercise) => exercise.exerciseId === exerciseId);
  if (!match) return null;
  return buildExerciseAcademyEntryFromCanonicalExercise(match);
}

export function buildExerciseAcademyPayloadRef(
  entry: ExerciseAcademyEntry,
  lessonModules: ExerciseLessonModule[],
): ExerciseAcademyPayloadRef {
  return {
    exerciseId: entry.exerciseId,
    academyVersion: entry.version,
    qualityScore: entry.quality.score,
    mediaPlanStatus: entry.mediaPlan.status,
    lessonModuleCount: lessonModules.length,
    lessonModuleTypes: lessonModules.map((module) => module.type),
    missingMediaSlotIds: entry.mediaPlan.missingSlotIds,
  };
}

export function buildExerciseAcademyPayloadRefForExerciseId(
  exerciseId: string,
  libraryExercises: WorkoutLibraryExercise[],
): ExerciseAcademyPayloadRef | null {
  const entry = getExerciseAcademyEntryById(exerciseId, libraryExercises);
  if (!entry) return null;
  const modules = buildExerciseLessonModules(entry);
  return buildExerciseAcademyPayloadRef(entry, modules);
}
