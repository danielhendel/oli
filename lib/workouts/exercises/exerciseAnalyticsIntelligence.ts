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
import {
  resolveCatalogExerciseIdByName,
  resolveCatalogExerciseIdFromCustomRecord,
  resolveCustomExercisePrimaryMuscleGroup,
} from "./customExerciseStore";
import {
  getExerciseMuscleContributions,
  getPrimaryMuscleGroupsForExercise,
  getPrimaryMuscleGroupsFromContributionList,
} from "./muscleContributions";
import { assignLegsExerciseToLowerBodySlice } from "./lowerBodySliceRules";
import type { ExerciseLibraryItemV1 } from "./library.v1";
import { resolveBundledExerciseIdForAnalyticsIntelligence } from "./taxonomyResolve";

import type { ExerciseIntelligenceV1 } from "./intelligence/exerciseIntelligenceV1Types";
import type { MuscleContribution, MuscleGroup, MuscleGroupCoarse } from "./taxonomy";
import { validateMuscleContributions } from "./taxonomy";

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
  /**
   * Additive hypertrophy intelligence overlay for the resolution catalog id.
   * Null when not seeded; does not alter contribution or classification fallbacks.
   */
  hypertrophyIntelligence: ExerciseIntelligenceV1 | null;
};

export type ExerciseAnalyticsResolutionContext = {
  customExerciseById?: ReadonlyMap<string, CustomExerciseRecord>;
  /**
   * Legacy fallback when a custom id has no row in `customExerciseById` (tests / gradual migration).
   */
  customPrimaryMuscleGroupByExerciseId?: ReadonlyMap<string, MuscleGroup>;
};

/** Optional tuning for legacy / ingested summaries where `exerciseId` is not a catalog id. */
export type ExerciseAnalyticsResolveOptions = {
  /**
   * Logged exercise display name (e.g. canonical name snapshot). Used only when the id does not
   * resolve to bundled or user definitions — best-effort match to bundled catalog by name/alias.
   */
  fallbackLoggedExerciseName?: string;
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
  leadMuscleFromContributions: MuscleGroup | null,
): ExerciseClassificationV1 | null {
  const slices = collectClassificationSlices(merged);
  if (slices.length === 0) return null;
  if (slices.length === 1) return slices[0]!;

  const leadFromContributions =
    leadMuscleFromContributions ?? getPrimaryMuscleGroupsForExercise(resolutionExerciseId)[0] ?? null;
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
  opts?: ExerciseAnalyticsResolveOptions,
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
      hypertrophyIntelligence: null,
    };
  }

  const customRow = context?.customExerciseById?.get(trimmed);

  let resolutionExerciseId = resolveBundledExerciseIdForAnalyticsIntelligence(trimmed);
  if (getLibraryItemByExerciseId(resolutionExerciseId) == null && customRow != null) {
    const alias = resolveCatalogExerciseIdFromCustomRecord(customRow);
    if (alias != null) resolutionExerciseId = alias;
  }
  if (getLibraryItemByExerciseId(resolutionExerciseId) == null && customRow == null) {
    const fb = opts?.fallbackLoggedExerciseName?.trim();
    if (fb != null && fb.length > 0) {
      const byName = resolveCatalogExerciseIdByName(fb);
      if (byName != null) resolutionExerciseId = byName;
    }
  }

  const merged = mergeExerciseIntelligenceForId(resolutionExerciseId);
  const libraryItem = merged.libraryItem;
  const userContributions =
    customRow?.muscleContributions != null && validateMuscleContributions(customRow.muscleContributions)
      ? customRow.muscleContributions
      : null;
  const catalogContributions = getExerciseMuscleContributions(resolutionExerciseId);
  const contributions = userContributions ?? catalogContributions;
  const hasContributionMap = contributions != null && contributions.length > 0;

  const leadMuscleFromContributions =
    hasContributionMap && contributions != null
      ? getPrimaryMuscleGroupsFromContributionList(contributions)[0] ?? null
      : null;

  const primarySlice = pickPrimaryClassificationSlice(
    merged,
    resolutionExerciseId,
    libraryItem,
    leadMuscleFromContributions,
  );

  let primaryMuscleGroup: MuscleGroup | null = primarySlice?.primaryMuscleGroup ?? null;
  let classificationSource: ExerciseAnalyticsClassificationSource = "unknown";

  if (primaryMuscleGroup != null) {
    classificationSource = "classification";
  } else if (hasContributionMap) {
    primaryMuscleGroup = leadMuscleFromContributions;
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
      : customRow?.movementPattern ?? merged.meta.movement;

  return {
    exerciseId: trimmed,
    resolutionExerciseId,
    primaryMuscleGroup,
    movementPattern,
    contributions,
    hasContributionMap,
    classificationSource,
    classification: primarySlice,
    hypertrophyIntelligence: merged.hypertrophyIntelligence,
  };
}
