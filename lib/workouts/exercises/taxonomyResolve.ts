/**
 * Shared taxonomy helpers: bundled catalog identity, picker visibility, and
 * analytics-safe id resolution (retired → successor) without importing UI layers.
 */

import type { ExerciseLibraryItemV1 } from "./library.v1";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";

let bundledNameById: ReadonlyMap<string, string> | null = null;

function bundledNameMap(): ReadonlyMap<string, string> {
  if (bundledNameById == null) {
    bundledNameById = new Map(EXERCISE_LIBRARY_V1.map((x) => [x.exerciseId, x.name]));
  }
  return bundledNameById;
}

/** Display name from bundled preload (any lifecycle: active, archived, retired). */
export function getBundledExerciseNameById(exerciseId: string): string | undefined {
  return bundledNameMap().get(exerciseId.trim());
}

export function getBundledLibraryItemByExerciseId(exerciseId: string): ExerciseLibraryItemV1 | null {
  const t = exerciseId.trim();
  if (t.length === 0) return null;
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.exerciseId === t) return row;
  }
  return null;
}

/**
 * For bundled `retired` rows with `successorExerciseId`, follow the chain for
 * classification / contribution lookups. Cycles fail closed (returns original id).
 */
export function resolveBundledExerciseIdForAnalyticsIntelligence(loggedExerciseId: string): string {
  const start = loggedExerciseId.trim();
  if (start.length === 0) return start;
  const seen = new Set<string>();
  let current = start;
  for (;;) {
    if (seen.has(current)) return start;
    seen.add(current);
    const row = getBundledLibraryItemByExerciseId(current);
    if (row == null) return current;
    const successor = row.successorExerciseId?.trim();
    if (row.status === "retired" && successor != null && successor.length > 0) {
      current = successor;
      continue;
    }
    return current;
  }
}
