import type { CustomExerciseLoggingType } from "./customExerciseStore";
import { EXERCISE_LIBRARY_V1, type ExerciseLibraryItemV1 } from "./library.v1";

export type StrengthLoggingType = "weight_reps" | "bodyweight_reps" | "reps_only";

export function normalizeStrengthLoggingType(
  value: CustomExerciseLoggingType | string | null | undefined,
): StrengthLoggingType {
  if (value === "bodyweight_reps") return "bodyweight_reps";
  if (value === "reps_only") return "reps_only";
  return "weight_reps";
}

export function supportsLoadEntry(loggingType: StrengthLoggingType): boolean {
  return loggingType === "weight_reps";
}

function classifyCanonicalLoggingType(item: ExerciseLibraryItemV1): StrengthLoggingType {
  if (item.equipment !== "Bodyweight") return "weight_reps";
  if (
    item.trainingType === "mobility" ||
    item.trainingType === "functional" ||
    item.trainingType === "conditioning"
  ) {
    return "reps_only";
  }
  return "bodyweight_reps";
}

const CANONICAL_LOGGING_TYPE_BY_EXERCISE_ID: Record<string, StrengthLoggingType> = Object.fromEntries(
  EXERCISE_LIBRARY_V1.map((item) => [item.exerciseId, classifyCanonicalLoggingType(item)]),
);

export function resolveStrengthLoggingType(
  exerciseId: string,
  customLoggingType?: CustomExerciseLoggingType | string | null,
): StrengthLoggingType {
  if (customLoggingType != null) return normalizeStrengthLoggingType(customLoggingType);
  return CANONICAL_LOGGING_TYPE_BY_EXERCISE_ID[exerciseId] ?? "weight_reps";
}
