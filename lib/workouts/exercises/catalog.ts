import type { ExerciseDefinitionStatus } from "./library.v1";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";

export type ExerciseCatalogItem = {
  exerciseId: string;
  name: string;
  aliases: string[];
};

/** Bundled rows user can add in normal create/picker flows (excludes archived + retired). */
export function isBundledExerciseSelectableInPickerStatus(status: ExerciseDefinitionStatus): boolean {
  return status === "active";
}

function toCatalogItem(x: (typeof EXERCISE_LIBRARY_V1)[number]): ExerciseCatalogItem {
  return {
    exerciseId: x.exerciseId,
    name: x.name,
    aliases: x.aliases,
  };
}

/** Full bundled catalog (all lifecycle states) — stable for metadata, lookups, and tests. */
export const EXERCISE_CATALOG_V1: ExerciseCatalogItem[] = EXERCISE_LIBRARY_V1.map(toCatalogItem);

/** Picker / search / add-exercise flows: active bundled preload only. */
export const EXERCISE_CATALOG_FOR_PICKER_V1: ExerciseCatalogItem[] = EXERCISE_LIBRARY_V1.filter((x) =>
  isBundledExerciseSelectableInPickerStatus(x.status),
).map(toCatalogItem);
