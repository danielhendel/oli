/**
 * Lookup + validation for bundled ExerciseIntelligenceV1 rows.
 * Pure — no IO, no React.
 */

import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { HYPERTROPHY_CORE_INTELLIGENCE_V1 } from "./hypertrophyCoreV1";
import {
  validateExerciseIntelligenceV1,
  type ExerciseIntelligenceV1,
} from "./exerciseIntelligenceV1Types";

const BY_EXERCISE_ID: Readonly<Record<string, ExerciseIntelligenceV1>> = Object.freeze(
  Object.fromEntries(HYPERTROPHY_CORE_INTELLIGENCE_V1.map((row) => [row.exerciseId, row])),
);

/** Bundled hypertrophy intelligence for a catalog exercise id; null when not seeded. */
export function getExerciseIntelligenceV1(exerciseId: string): ExerciseIntelligenceV1 | null {
  const trimmed = exerciseId.trim();
  if (trimmed.length === 0) return null;
  return BY_EXERCISE_ID[trimmed] ?? null;
}

/** All seeded exercise ids (sorted). */
export function getSeededExerciseIntelligenceIds(): string[] {
  return Object.keys(BY_EXERCISE_ID).sort((a, b) => a.localeCompare(b));
}

export type ExerciseIntelligenceRegistryIssue =
  | { kind: "intelligence_key_not_in_library"; exerciseId: string }
  | { kind: "invalid_intelligence_row"; exerciseId: string };

/** Returns empty when the hypertrophy core seed aligns with the library and passes validation. */
export function validateExerciseIntelligenceRegistry(): ExerciseIntelligenceRegistryIssue[] {
  const libraryIds = new Set(EXERCISE_LIBRARY_V1.map((x) => x.exerciseId));
  const issues: ExerciseIntelligenceRegistryIssue[] = [];
  for (const row of HYPERTROPHY_CORE_INTELLIGENCE_V1) {
    if (!libraryIds.has(row.exerciseId)) {
      issues.push({ kind: "intelligence_key_not_in_library", exerciseId: row.exerciseId });
    }
    if (!validateExerciseIntelligenceV1(row)) {
      issues.push({ kind: "invalid_intelligence_row", exerciseId: row.exerciseId });
    }
  }
  return issues;
}
