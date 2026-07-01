import { TOP25_EXERCISE_ENRICHMENT_ENTRIES } from "./top25ExerciseEnrichmentEntries";
import type { ExerciseLibraryEnrichmentV1 } from "./types";

export { EXERCISE_LIBRARY_ENRICHMENT_VERSION } from "./types";
export type { ExerciseLibraryEnrichmentV1 } from "./types";

/** Additive enrichment dataset keyed by canonical exerciseId. */
export const EXERCISE_LIBRARY_ENRICHMENT_V1: readonly ExerciseLibraryEnrichmentV1[] =
  TOP25_EXERCISE_ENRICHMENT_ENTRIES;

export const TOP25_EXERCISE_ENRICHMENT_IDS: readonly string[] =
  TOP25_EXERCISE_ENRICHMENT_ENTRIES.map((entry) => entry.exerciseId);

const enrichmentById = new Map<string, ExerciseLibraryEnrichmentV1>(
  EXERCISE_LIBRARY_ENRICHMENT_V1.map((entry) => [entry.exerciseId, entry]),
);

export function getExerciseLibraryEnrichmentById(
  exerciseId: string,
): ExerciseLibraryEnrichmentV1 | null {
  return enrichmentById.get(exerciseId) ?? null;
}

export function hasExerciseLibraryEnrichment(exerciseId: string): boolean {
  return enrichmentById.has(exerciseId);
}

export function listExerciseLibraryEnrichmentEntries(): readonly ExerciseLibraryEnrichmentV1[] {
  return [...EXERCISE_LIBRARY_ENRICHMENT_V1].sort((a, b) =>
    a.exerciseId.localeCompare(b.exerciseId),
  );
}
