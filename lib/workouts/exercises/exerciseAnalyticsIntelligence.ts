/**
 * Canonical **analytics** view for an exercise: classification-first, then contributions,
 * then library/custom fallbacks. Safe for unknown and custom ids.
 *
 * Precedence is documented in `PRODUCT_RULES_EXERCISE_ANALYTICS_INTELLIGENCE.md`.
 */

import type { ExerciseClassificationV1 } from "./classificationTypes";
import {
  getLibraryItemByExerciseId,
  mergeExerciseIntelligenceForId,
  type MergedExerciseIntelligenceView,
} from "./classificationResolvers";
import type { CustomExerciseRecord } from "./customExerciseStore";
import { resolveCatalogExerciseIdByName, resolveCustomExercisePrimaryMuscleGroup } from "./customExerciseStore";
import {
  getExerciseMuscleContributions,
  getPrimaryMuscleGroupsForExercise,
} from "./muscleContributions";
import { assignLegsExerciseToLowerBodySlice } from "./lowerBodySliceRules";
import type { ExerciseLibraryItemV1 } from "./library.v1";

import type { MuscleContribution, MuscleGroup, MuscleGroupCoarse } from "./taxonomy";

export type ExerciseAnalyticsClassificationSource =
  | "classification"
  | "contribution"
  | "library"
  | "custom"
  | "unknown";

export type ResolvedExerciseAnalytics = {
  /** Logged `exerciseId` (trimmed), not the catalog alias id. */
  exerciseId: string;
  /** Catalog id used for library/classification/contributions (may equal `exerciseId`). */
  resolutionExerciseId: string;
  primaryMuscleGroup: MuscleGroup | null;
  movementPattern: string | null;
  contributions: readonly MuscleContribution[] | null;
  hasContributionMap: boolean;
  classificationSource: ExerciseAnalyticsClassificationSource;
  /** Primary classification slice chosen for analytics (movement + primary muscle). */
  classification: ExerciseClassificationV1 | null;
};

export type ExerciseAnalyticsResolutionContext = {
  customExerciseById?: ReadonlyMap<string, CustomExerciseRecord>;
  /**
   * Legacy fallback when a custom id has no row in `customExerciseById` (tests / gradual migration).
   */
  customPrimaryMuscleGroupByExerciseId?: ReadonlyMap<string, MuscleGroup>;
};

type ClassificationSliceKey =
  | "quadsClassification"
  | "hamstringsClassification"
  | "glutesClassification"
  | "calvesClassification"
  | "chestClassification"
  | "backClassification"
  | "shouldersClassification"
  | "bicepsClassification"
  | "tricepsClassification"
  | "forearmsClassification"
  | "coreClassification";

const CLASSIFICATION_SLICE_KEYS: readonly ClassificationSliceKey[] = [
  "quadsClassification",
  "hamstringsClassification",
  "glutesClassification",
  "calvesClassification",
  "chestClassification",
  "backClassification",
  "shouldersClassification",
  "bicepsClassification",
  "tricepsClassification",
  "forearmsClassification",
  "coreClassification",
] as const;

function collectClassificationSlices(merged: MergedExerciseIntelligenceView): ExerciseClassificationV1[] {
  const out: ExerciseClassificationV1[] = [];
  for (const key of CLASSIFICATION_SLICE_KEYS) {
    const row = merged[key];
    if (row != null) out.push(row);
  }
  return out;
}

function muscleGroupMatchesLegSlice(
  group: ExerciseClassificationV1["primaryMuscleGroup"],
  legSlice: ReturnType<typeof assignLegsExerciseToLowerBodySlice>,
): boolean {
  return group === legSlice;
}

function pickPrimaryClassificationSlice(
  merged: MergedExerciseIntelligenceView,
  resolutionExerciseId: string,
  libraryItem: ExerciseLibraryItemV1 | null,
): ExerciseClassificationV1 | null {
  const slices = collectClassificationSlices(merged);
  if (slices.length === 0) return null;
  if (slices.length === 1) return slices[0]!;

  const leadFromContributions = getPrimaryMuscleGroupsForExercise(resolutionExerciseId)[0];
  if (leadFromContributions != null) {
    const match = slices.find((s) => s.primaryMuscleGroup === leadFromContributions);
    if (match != null) return match;
  }

  if (libraryItem != null && libraryItem.primaryBucket === "Legs") {
    const legSlice = assignLegsExerciseToLowerBodySlice(libraryItem);
    const match = slices.find((s) => muscleGroupMatchesLegSlice(s.primaryMuscleGroup, legSlice));
    if (match != null) return match;
  }

  return slices[0]!;
}

function primaryMuscleGroupFromCoarseFirst(coarse: MuscleGroupCoarse | undefined): MuscleGroup | null {
  switch (coarse) {
    case "Chest":
      return "chest";
    case "Back":
      return "back";
    case "Shoulders":
      return "shoulders";
    case "Biceps":
      return "biceps";
    case "Triceps":
      return "triceps";
    case "Forearms":
      return "forearms";
    case "Core":
      return "core";
    case "Quads":
      return "quads";
    case "Hamstrings":
      return "hamstrings";
    case "Glutes":
      return "glutes";
    case "Calves":
      return "calves";
    case "Hips":
      return "glutes";
    case "Legs":
      return "quads";
    default:
      return null;
  }
}

function libraryBucketFallbackMuscleGroup(libraryItem: ExerciseLibraryItemV1): MuscleGroup | null {
  const b = libraryItem.primaryBucket;
  if (b === "Chest") return "chest";
  if (b === "Back") return "back";
  if (b === "Shoulders") return "shoulders";
  if (b === "Triceps") return "triceps";
  if (b === "Biceps") return "biceps";
  if (b === "Core") return "core";
  return null;
}

/**
 * Single entry point for workout analytics (weekly muscle volume/sets, future charts).
 */
export function resolveExerciseIntelligenceForAnalytics(
  exerciseId: string,
  context?: ExerciseAnalyticsResolutionContext,
): ResolvedExerciseAnalytics {
  const trimmed = exerciseId.trim();
  if (trimmed.length === 0) {
    return {
      exerciseId: trimmed,
      resolutionExerciseId: trimmed,
      primaryMuscleGroup: null,
      movementPattern: null,
      contributions: null,
      hasContributionMap: false,
      classificationSource: "unknown",
      classification: null,
    };
  }

  const customRow = context?.customExerciseById?.get(trimmed);
  const libraryItemLogged = getLibraryItemByExerciseId(trimmed);

  let resolutionExerciseId = trimmed;
  if (libraryItemLogged == null && customRow != null) {
    const alias = resolveCatalogExerciseIdByName(customRow.name);
    if (alias != null) resolutionExerciseId = alias;
  }

  const merged = mergeExerciseIntelligenceForId(resolutionExerciseId);
  const libraryItem = merged.libraryItem;
  const contributions = getExerciseMuscleContributions(resolutionExerciseId);
  const hasContributionMap = contributions != null && contributions.length > 0;

  const primarySlice = pickPrimaryClassificationSlice(merged, resolutionExerciseId, libraryItem);

  let primaryMuscleGroup: MuscleGroup | null = primarySlice?.primaryMuscleGroup ?? null;
  let classificationSource: ExerciseAnalyticsClassificationSource = "unknown";

  if (primaryMuscleGroup != null) {
    classificationSource = "classification";
  } else if (hasContributionMap) {
    primaryMuscleGroup = getPrimaryMuscleGroupsForExercise(resolutionExerciseId)[0] ?? null;
    if (primaryMuscleGroup != null) classificationSource = "contribution";
  } else if (libraryItem != null) {
    primaryMuscleGroup = libraryBucketFallbackMuscleGroup(libraryItem);
    if (primaryMuscleGroup != null) {
      classificationSource = "library";
    } else {
      primaryMuscleGroup = primaryMuscleGroupFromCoarseFirst(libraryItem.primaryCoarse[0]);
      if (primaryMuscleGroup != null) classificationSource = "library";
    }
  }

  if (primaryMuscleGroup == null && customRow != null) {
    primaryMuscleGroup = resolveCustomExercisePrimaryMuscleGroup(customRow);
    if (primaryMuscleGroup != null) classificationSource = "custom";
  }

  if (primaryMuscleGroup == null) {
    primaryMuscleGroup = context?.customPrimaryMuscleGroupByExerciseId?.get(trimmed) ?? null;
    if (primaryMuscleGroup != null) classificationSource = "custom";
  }

  const movementPattern =
    primarySlice != null
      ? primarySlice.primaryPattern
      : merged.meta.movement;

  return {
    exerciseId: trimmed,
    resolutionExerciseId,
    primaryMuscleGroup,
    movementPattern,
    contributions,
    hasContributionMap,
    classificationSource,
    classification: primarySlice,
  };
}
