/**
 * Resolvers merging catalog identity, existing metadata, and additive classifications.
 * Safe for unknown ids: never throws; missing classification returns null.
 */

import type { BackExerciseClassificationV1 } from "./classificationTypes";
import type { BicepsExerciseClassificationV1 } from "./classificationTypes";
import type { CalvesExerciseClassificationV1 } from "./classificationTypes";
import type { ChestExerciseClassificationV1 } from "./classificationTypes";
import type { CoreExerciseClassificationV1 } from "./classificationTypes";
import type { ForearmsExerciseClassificationV1 } from "./classificationTypes";
import type { GlutesExerciseClassificationV1 } from "./classificationTypes";
import type { HamstringsExerciseClassificationV1 } from "./classificationTypes";
import type { QuadsExerciseClassificationV1 } from "./classificationTypes";
import type { ShoulderExerciseClassificationV1 } from "./classificationTypes";
import type { TricepsExerciseClassificationV1 } from "./classificationTypes";
import { BACK_CLASSIFICATION_BY_EXERCISE_ID } from "./classificationsBack.v1";
import {
  BICEPS_CLASSIFICATION_BY_EXERCISE_ID,
  FOREARMS_CLASSIFICATION_BY_EXERCISE_ID,
  TRICEPS_CLASSIFICATION_BY_EXERCISE_ID,
} from "./classificationsArms.v1";
import { CHEST_CLASSIFICATION_BY_EXERCISE_ID } from "./classifications.v1";
import { SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID } from "./classificationsShoulders.v1";
import {
  CALVES_CLASSIFICATION_BY_EXERCISE_ID,
  GLUTES_CLASSIFICATION_BY_EXERCISE_ID,
  HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID,
  QUADS_CLASSIFICATION_BY_EXERCISE_ID,
} from "./classificationsLowerBody.v1";
import { CORE_CLASSIFICATION_BY_EXERCISE_ID } from "./classificationsCore.v1";
import type { ExerciseLibraryItemV1 } from "./library.v1";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";
import {
  getExpectedCalvesSliceExerciseIds,
  getExpectedGlutesSliceExerciseIds,
  getExpectedHamstringsSliceExerciseIds,
  getExpectedQuadsSliceExerciseIds,
} from "./lowerBodySliceRules";
import { getExerciseIntelligenceV1 } from "./intelligence/exerciseIntelligenceV1Registry";
import type { ExerciseIntelligenceV1 } from "./intelligence/exerciseIntelligenceV1Types";
import { getExerciseMeta, type ExerciseMeta } from "./metadata";

export type MergedExerciseIntelligenceView = {
  exerciseId: string;
  /** Row from EXERCISE_LIBRARY_V1 when id is a standard exercise; null for unknown/custom ids. */
  libraryItem: ExerciseLibraryItemV1 | null;
  /** Existing deterministic metadata (defaults for unknown ids). */
  meta: ExerciseMeta;
  /** Additive hypertrophy intelligence overlay; null when not seeded for this id. */
  hypertrophyIntelligence: ExerciseIntelligenceV1 | null;
  /** Chest slice; null when no chest row. */
  chestClassification: ChestExerciseClassificationV1 | null;
  /** Back slice; null when no back row. */
  backClassification: BackExerciseClassificationV1 | null;
  /** Shoulders slice; null when no shoulders row. */
  shouldersClassification: ShoulderExerciseClassificationV1 | null;
  /** Biceps slice; null when no biceps row. */
  bicepsClassification: BicepsExerciseClassificationV1 | null;
  /** Triceps slice; null when no triceps row. */
  tricepsClassification: TricepsExerciseClassificationV1 | null;
  /** Forearms slice; null when no forearms row (empty registry until catalog adds `Forearms` bucket). */
  forearmsClassification: ForearmsExerciseClassificationV1 | null;
  quadsClassification: QuadsExerciseClassificationV1 | null;
  hamstringsClassification: HamstringsExerciseClassificationV1 | null;
  glutesClassification: GlutesExerciseClassificationV1 | null;
  calvesClassification: CalvesExerciseClassificationV1 | null;
  /** Core slice; null when no core row. */
  coreClassification: CoreExerciseClassificationV1 | null;
};

export function getLibraryItemByExerciseId(exerciseId: string): ExerciseLibraryItemV1 | null {
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.exerciseId === exerciseId) return row;
  }
  return null;
}

/** Chest category classification only; null if this id has no chest slice row. */
export function resolveChestClassification(exerciseId: string): ChestExerciseClassificationV1 | null {
  return CHEST_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

/** Back category classification only; null if this id has no back slice row. */
export function resolveBackClassification(exerciseId: string): BackExerciseClassificationV1 | null {
  return BACK_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

/** Shoulders category classification only; null if this id has no shoulders slice row. */
export function resolveShouldersClassification(exerciseId: string): ShoulderExerciseClassificationV1 | null {
  return SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

/** Biceps category classification only; null if this id has no biceps slice row. */
export function resolveBicepsClassification(exerciseId: string): BicepsExerciseClassificationV1 | null {
  return BICEPS_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

/** Triceps category classification only; null if this id has no triceps slice row. */
export function resolveTricepsClassification(exerciseId: string): TricepsExerciseClassificationV1 | null {
  return TRICEPS_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

/** Forearms category classification only; null if this id has no forearms slice row. */
export function resolveForearmsClassification(exerciseId: string): ForearmsExerciseClassificationV1 | null {
  return FOREARMS_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

export function resolveQuadsClassification(exerciseId: string): QuadsExerciseClassificationV1 | null {
  return QUADS_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

export function resolveHamstringsClassification(exerciseId: string): HamstringsExerciseClassificationV1 | null {
  return HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

export function resolveGlutesClassification(exerciseId: string): GlutesExerciseClassificationV1 | null {
  return GLUTES_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

export function resolveCalvesClassification(exerciseId: string): CalvesExerciseClassificationV1 | null {
  return CALVES_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

/** Core category classification only; null if this id has no core slice row. */
export function resolveCoreClassification(exerciseId: string): CoreExerciseClassificationV1 | null {
  return CORE_CLASSIFICATION_BY_EXERCISE_ID[exerciseId] ?? null;
}

export function mergeExerciseIntelligenceForId(exerciseId: string): MergedExerciseIntelligenceView {
  const trimmed = exerciseId.trim();
  return {
    exerciseId: trimmed,
    libraryItem: getLibraryItemByExerciseId(trimmed),
    meta: getExerciseMeta(trimmed),
    hypertrophyIntelligence: getExerciseIntelligenceV1(trimmed),
    chestClassification: resolveChestClassification(trimmed),
    backClassification: resolveBackClassification(trimmed),
    shouldersClassification: resolveShouldersClassification(trimmed),
    bicepsClassification: resolveBicepsClassification(trimmed),
    tricepsClassification: resolveTricepsClassification(trimmed),
    forearmsClassification: resolveForearmsClassification(trimmed),
    quadsClassification: resolveQuadsClassification(trimmed),
    hamstringsClassification: resolveHamstringsClassification(trimmed),
    glutesClassification: resolveGlutesClassification(trimmed),
    calvesClassification: resolveCalvesClassification(trimmed),
    coreClassification: resolveCoreClassification(trimmed),
  };
}

export function getLibraryChestExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Chest") out.push(row.exerciseId);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getLibraryBackExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Back") out.push(row.exerciseId);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getLibraryShouldersExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Shoulders") out.push(row.exerciseId);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getLibraryBicepsExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Biceps") out.push(row.exerciseId);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getLibraryTricepsExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Triceps") out.push(row.exerciseId);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/**
 * Reserved for symmetry with other buckets. `PrimaryBucket` has no `Forearms` value yet;
 * extend this when taxonomy adds that bucket.
 */
export function getLibraryForearmsExerciseIds(): string[] {
  return [];
}

export function getLibraryCoreExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Core") out.push(row.exerciseId);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export type ChestRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_chest_missing_classification"; exerciseId: string };

/**
 * Returns empty when chest registry is aligned with `primaryBucket: "Chest"` in the library.
 */
export function validateChestClassificationRegistry(): ChestRegistryValidationIssue[] {
  const libraryChest = new Set(getLibraryChestExerciseIds());
  const issues: ChestRegistryValidationIssue[] = [];
  for (const id of Object.keys(CHEST_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryChest.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryChest) {
    if (CHEST_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_chest_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type BackRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_back_missing_classification"; exerciseId: string };

/**
 * Returns empty when back registry is aligned with `primaryBucket: "Back"` in the library.
 */
export function validateBackClassificationRegistry(): BackRegistryValidationIssue[] {
  const libraryBack = new Set(getLibraryBackExerciseIds());
  const issues: BackRegistryValidationIssue[] = [];
  for (const id of Object.keys(BACK_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryBack.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryBack) {
    if (BACK_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_back_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type ShouldersRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_shoulders_missing_classification"; exerciseId: string };

/**
 * Returns empty when shoulders registry is aligned with `primaryBucket: "Shoulders"` in the library.
 */
export function validateShouldersClassificationRegistry(): ShouldersRegistryValidationIssue[] {
  const libraryShoulders = new Set(getLibraryShouldersExerciseIds());
  const issues: ShouldersRegistryValidationIssue[] = [];
  for (const id of Object.keys(SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryShoulders.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryShoulders) {
    if (SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_shoulders_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type BicepsRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_biceps_missing_classification"; exerciseId: string };

/** Returns empty when biceps registry matches `primaryBucket: "Biceps"`. */
export function validateBicepsClassificationRegistry(): BicepsRegistryValidationIssue[] {
  const libraryBiceps = new Set(getLibraryBicepsExerciseIds());
  const issues: BicepsRegistryValidationIssue[] = [];
  for (const id of Object.keys(BICEPS_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryBiceps.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryBiceps) {
    if (BICEPS_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_biceps_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type TricepsRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_triceps_missing_classification"; exerciseId: string };

/** Returns empty when triceps registry matches `primaryBucket: "Triceps"`. */
export function validateTricepsClassificationRegistry(): TricepsRegistryValidationIssue[] {
  const libraryTriceps = new Set(getLibraryTricepsExerciseIds());
  const issues: TricepsRegistryValidationIssue[] = [];
  for (const id of Object.keys(TRICEPS_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryTriceps.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryTriceps) {
    if (TRICEPS_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_triceps_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type ForearmsRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_forearms_missing_classification"; exerciseId: string };

/** Returns empty when forearms registry matches library `Forearms` bucket (currently none). */
export function validateForearmsClassificationRegistry(): ForearmsRegistryValidationIssue[] {
  const libraryForearms = new Set(getLibraryForearmsExerciseIds());
  const issues: ForearmsRegistryValidationIssue[] = [];
  for (const id of Object.keys(FOREARMS_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryForearms.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryForearms) {
    if (FOREARMS_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_forearms_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type QuadsRegistryValidationIssue =
  | { kind: "classification_key_not_in_expected_set"; exerciseId: string }
  | { kind: "expected_quads_missing_classification"; exerciseId: string };

/** Registry keys must match `getExpectedQuadsSliceExerciseIds()` (see lower-body product rules). */
export function validateQuadsClassificationRegistry(): QuadsRegistryValidationIssue[] {
  const expected = new Set(getExpectedQuadsSliceExerciseIds());
  const issues: QuadsRegistryValidationIssue[] = [];
  for (const id of Object.keys(QUADS_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!expected.has(id)) {
      issues.push({ kind: "classification_key_not_in_expected_set", exerciseId: id });
    }
  }
  for (const id of expected) {
    if (QUADS_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "expected_quads_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type HamstringsRegistryValidationIssue =
  | { kind: "classification_key_not_in_expected_set"; exerciseId: string }
  | { kind: "expected_hamstrings_missing_classification"; exerciseId: string };

export function validateHamstringsClassificationRegistry(): HamstringsRegistryValidationIssue[] {
  const expected = new Set(getExpectedHamstringsSliceExerciseIds());
  const issues: HamstringsRegistryValidationIssue[] = [];
  for (const id of Object.keys(HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!expected.has(id)) {
      issues.push({ kind: "classification_key_not_in_expected_set", exerciseId: id });
    }
  }
  for (const id of expected) {
    if (HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "expected_hamstrings_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type GlutesRegistryValidationIssue =
  | { kind: "classification_key_not_in_expected_set"; exerciseId: string }
  | { kind: "expected_glutes_missing_classification"; exerciseId: string };

export function validateGlutesClassificationRegistry(): GlutesRegistryValidationIssue[] {
  const expected = new Set(getExpectedGlutesSliceExerciseIds());
  const issues: GlutesRegistryValidationIssue[] = [];
  for (const id of Object.keys(GLUTES_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!expected.has(id)) {
      issues.push({ kind: "classification_key_not_in_expected_set", exerciseId: id });
    }
  }
  for (const id of expected) {
    if (GLUTES_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "expected_glutes_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type CalvesRegistryValidationIssue =
  | { kind: "classification_key_not_in_expected_set"; exerciseId: string }
  | { kind: "expected_calves_missing_classification"; exerciseId: string };

export function validateCalvesClassificationRegistry(): CalvesRegistryValidationIssue[] {
  const expected = new Set(getExpectedCalvesSliceExerciseIds());
  const issues: CalvesRegistryValidationIssue[] = [];
  for (const id of Object.keys(CALVES_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!expected.has(id)) {
      issues.push({ kind: "classification_key_not_in_expected_set", exerciseId: id });
    }
  }
  for (const id of expected) {
    if (CALVES_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "expected_calves_missing_classification", exerciseId: id });
    }
  }
  return issues;
}

export type CoreRegistryValidationIssue =
  | { kind: "classification_key_not_in_library"; exerciseId: string }
  | { kind: "library_core_missing_classification"; exerciseId: string };

/**
 * Returns empty when core registry is aligned with `primaryBucket: "Core"` in the library.
 */
export function validateCoreClassificationRegistry(): CoreRegistryValidationIssue[] {
  const libraryCore = new Set(getLibraryCoreExerciseIds());
  const issues: CoreRegistryValidationIssue[] = [];
  for (const id of Object.keys(CORE_CLASSIFICATION_BY_EXERCISE_ID)) {
    if (!libraryCore.has(id)) {
      issues.push({ kind: "classification_key_not_in_library", exerciseId: id });
    }
  }
  for (const id of libraryCore) {
    if (CORE_CLASSIFICATION_BY_EXERCISE_ID[id] == null) {
      issues.push({ kind: "library_core_missing_classification", exerciseId: id });
    }
  }
  return issues;
}
