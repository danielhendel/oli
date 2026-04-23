/**
 * Pure aggregation for bundled exercise usage exports (Firestore export CLI uses this).
 * Resolver paths: {@link resolveExerciseIntelligenceForAnalytics} + {@link EXERCISE_LIBRARY_V1}.
 */

import type { ExerciseAnalyticsResolutionContext } from "./exerciseAnalyticsIntelligence";
import { resolveExerciseIntelligenceForAnalytics } from "./exerciseAnalyticsIntelligence";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";
import { bundledExerciseIdsAmbiguousForAutoArchive } from "./bundledExerciseArchiveAudit";
import { resolveCatalogExerciseIdByName } from "./customExerciseStore";

export type StrengthExerciseLike = {
  exerciseId: string;
  name: string;
};

export function isSyntheticIngestedExerciseId(loggedExerciseId: string): boolean {
  return loggedExerciseId.trim().startsWith("exercise:ingested:");
}

export function isBundledCatalogExerciseId(exerciseId: string): boolean {
  const t = exerciseId.trim();
  if (t.length === 0) return false;
  return EXERCISE_LIBRARY_V1.some((r) => r.exerciseId === t);
}

export type BundledExerciseUsageAggregation = {
  /** Non-synthetic `exerciseId` values seen in strength payloads (includes custom ids). */
  distinctStableExerciseIdsFromStrengthPayloads: string[];
  /** All distinct trimmed exercise names from parsed strength exercises. */
  distinctExerciseNamesFromStrengthHistory: string[];
  /** Bundled catalog ids that appear as `resolutionExerciseId` after analytics resolve (successor chain included). */
  bundledExerciseIdsUsed: string[];
  /** Per-name map: `resolveCatalogExerciseIdByName` only (fast path). */
  legacyNamesToBundledViaNameLookup: Record<string, string | null>;
  /** Per-name map: full `resolveExerciseIntelligenceForAnalytics` with synthetic id + fallback name when applicable. */
  legacyNamesToBundledViaAnalyticsResolver: Record<string, string | null>;
  /** Names that appeared on synthetic-ingest rows where analytics did not resolve to a bundled catalog id. */
  unresolvedLegacyExerciseNames: { name: string; reason: "no_bundled_resolution_after_analytics" }[];
  ambiguousBundledExerciseIds: string[];
  unusedBundledExerciseIds: string[];
  counts: {
    bundledCatalogSize: number;
    bundledUsedCount: number;
    ambiguousCount: number;
    unusedCount: number;
    strengthExerciseRowsProcessed: number;
    rawEventsProcessed: number;
  };
};

/**
 * Fold parsed strength exercises (same shape as `parseStrengthIngestExercisesFromPayload` output).
 */
export function aggregateBundledExerciseUsageFromStrengthExercises(
  exercises: readonly StrengthExerciseLike[],
  context: ExerciseAnalyticsResolutionContext | undefined,
): Omit<BundledExerciseUsageAggregation, "ambiguousBundledExerciseIds" | "unusedBundledExerciseIds" | "counts"> & {
  bundledUsedSet: Set<string>;
} {
  const stableNonSynthetic = new Set<string>();
  const allNames = new Set<string>();
  const bundledUsedSet = new Set<string>();
  const legacyNamesToBundledViaNameLookup: Record<string, string | null> = {};
  /** Only names that appeared on at least one synthetic-ingest row; final bundled id or null. */
  const syntheticNameToBundledResolution = new Map<string, string | null>();

  for (const ex of exercises) {
    const loggedId = ex.exerciseId.trim();
    const name = ex.name.trim();
    if (name.length > 0) {
      allNames.add(name);
      if (legacyNamesToBundledViaNameLookup[name] === undefined) {
        legacyNamesToBundledViaNameLookup[name] = resolveCatalogExerciseIdByName(name);
      }
    }

    const synthetic = isSyntheticIngestedExerciseId(loggedId);
    if (!synthetic) stableNonSynthetic.add(loggedId);

    const resolved = resolveExerciseIntelligenceForAnalytics(
      loggedId,
      context,
      synthetic ? { fallbackLoggedExerciseName: name } : {},
    );
    const rid = resolved.resolutionExerciseId.trim();
    if (isBundledCatalogExerciseId(rid)) bundledUsedSet.add(rid);

    if (synthetic && name.length > 0) {
      if (isBundledCatalogExerciseId(rid)) {
        syntheticNameToBundledResolution.set(name, rid);
      } else if (!syntheticNameToBundledResolution.has(name)) {
        syntheticNameToBundledResolution.set(name, null);
      }
    }
  }

  const legacyNamesToBundledViaAnalyticsResolver: Record<string, string | null> = {};
  for (const [n, v] of [...syntheticNameToBundledResolution.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    legacyNamesToBundledViaAnalyticsResolver[n] = v;
  }

  const unresolvedLegacyExerciseNames: {
    name: string;
    reason: "no_bundled_resolution_after_analytics";
  }[] = [];
  for (const [n, v] of syntheticNameToBundledResolution) {
    if (v === null) unresolvedLegacyExerciseNames.push({ name: n, reason: "no_bundled_resolution_after_analytics" });
  }
  unresolvedLegacyExerciseNames.sort((a, b) => a.name.localeCompare(b.name));

  return {
    distinctStableExerciseIdsFromStrengthPayloads: [...stableNonSynthetic].sort((a, b) => a.localeCompare(b)),
    distinctExerciseNamesFromStrengthHistory: [...allNames].sort((a, b) => a.localeCompare(b)),
    bundledExerciseIdsUsed: [...bundledUsedSet].sort((a, b) => a.localeCompare(b)),
    legacyNamesToBundledViaNameLookup,
    legacyNamesToBundledViaAnalyticsResolver,
    unresolvedLegacyExerciseNames,
    bundledUsedSet,
  };
}

export function finalizeBundledExerciseUsageAggregation(
  partial: Omit<BundledExerciseUsageAggregation, "ambiguousBundledExerciseIds" | "unusedBundledExerciseIds" | "counts"> & {
    bundledUsedSet: Set<string>;
  },
  opts: {
    strengthExerciseRowsProcessed: number;
    rawEventsProcessed: number;
  },
): BundledExerciseUsageAggregation {
  const ambiguousBundledExerciseIds = [...bundledExerciseIdsAmbiguousForAutoArchive()].sort((a, b) =>
    a.localeCompare(b),
  );
  const ambiguousSet = new Set(ambiguousBundledExerciseIds);
  const bundledCatalogIds = EXERCISE_LIBRARY_V1.map((r) => r.exerciseId);
  const unusedBundledExerciseIds = bundledCatalogIds.filter(
    (id) => !partial.bundledUsedSet.has(id) && !ambiguousSet.has(id),
  );

  return {
    distinctStableExerciseIdsFromStrengthPayloads: partial.distinctStableExerciseIdsFromStrengthPayloads,
    distinctExerciseNamesFromStrengthHistory: partial.distinctExerciseNamesFromStrengthHistory,
    bundledExerciseIdsUsed: partial.bundledExerciseIdsUsed,
    legacyNamesToBundledViaNameLookup: partial.legacyNamesToBundledViaNameLookup,
    legacyNamesToBundledViaAnalyticsResolver: partial.legacyNamesToBundledViaAnalyticsResolver,
    unresolvedLegacyExerciseNames: partial.unresolvedLegacyExerciseNames,
    ambiguousBundledExerciseIds,
    unusedBundledExerciseIds,
    counts: {
      bundledCatalogSize: bundledCatalogIds.length,
      bundledUsedCount: partial.bundledExerciseIdsUsed.length,
      ambiguousCount: ambiguousBundledExerciseIds.length,
      unusedCount: unusedBundledExerciseIds.length,
      strengthExerciseRowsProcessed: opts.strengthExerciseRowsProcessed,
      rawEventsProcessed: opts.rawEventsProcessed,
    },
  };
}
