import type { ExerciseCatalogItem } from "./catalog";

/**
 * When `allowlistExerciseIds` is undefined, returns the full bundled picker catalog.
 * When set (including `[]`), returns only bundled items whose `exerciseId` is in the allowlist.
 * Custom exercises are merged separately by the picker and are unaffected by this filter.
 */
export function bundledCatalogItemsForWorkoutPicker(
  bundledPickerCatalog: readonly ExerciseCatalogItem[],
  allowlistExerciseIds: readonly string[] | undefined,
): ExerciseCatalogItem[] {
  if (allowlistExerciseIds === undefined) {
    return [...bundledPickerCatalog];
  }
  const allow = new Set(allowlistExerciseIds);
  return bundledPickerCatalog.filter((item) => allow.has(item.exerciseId));
}
