/**
 * Deterministic strength taxonomy rollup from canonical exercise summaries (journal or ingest parse).
 * Single implementation for weekly UI cards and persisted workout day/month summary aggregates.
 *
 * Resolution: `resolveExerciseIntelligenceForAnalytics(loggedExerciseId, ctx, { fallbackLoggedExerciseName })`
 * — exerciseId-first; name-derived catalog match when ingest omits ids (PR 4).
 */

import type { ExerciseAnalyticsResolutionContext } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import { resolveExerciseIntelligenceForAnalytics } from "@/lib/workouts/exercises/exerciseAnalyticsIntelligence";
import { getExerciseMeta } from "@/lib/workouts/exercises/metadata";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import { getMuscleGroupForSubgroup } from "@/lib/workouts/exercises/taxonomy";
import type { ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { trainingVolumeKgForManualExercise } from "@/lib/workouts/strength/strengthVolumeKg";

export type StrengthTaxonomySerialized = {
  muscleVolumeKgByGroup: Record<string, number>;
  muscleSetCountByGroup: Record<string, number>;
  movementVolumeKg: Record<string, number>;
  equipmentVolumeKg: Record<string, number>;
  /** Sum of per-exercise training volumes (non-warmup sets) included in taxonomy splits. */
  strengthTrainingVolumeKg: number;
};

export type StrengthTaxonomyAggregateMaps = {
  muscleVolumeKg: Map<MuscleGroup, number>;
  muscleSets: Map<MuscleGroup, number>;
  movementVolumeKg: Map<string, number>;
  equipmentVolumeKg: Map<string, number>;
  strengthTrainingVolumeKg: number;
};

function normalizeExerciseIdKey(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return v.length > 0 ? v : null;
}

export function countedNonWarmupSets(exercise: ManualWorkoutExerciseSummary): number {
  let count = 0;
  for (const set of exercise.sets) {
    if (set.isWarmup === true) continue;
    count += 1;
  }
  return count;
}

export function createEmptyStrengthTaxonomyMaps(): StrengthTaxonomyAggregateMaps {
  return {
    muscleVolumeKg: new Map(),
    muscleSets: new Map(),
    movementVolumeKg: new Map(),
    equipmentVolumeKg: new Map(),
    strengthTrainingVolumeKg: 0,
  };
}

/**
 * Merges per-exercise rollups into aggregate maps (mutates `into`).
 * Cache is per call — use one merge pass per summary scope (week / day / month).
 */
export function mergeManualExercisesIntoStrengthTaxonomyMaps(
  into: StrengthTaxonomyAggregateMaps,
  exercises: readonly ManualWorkoutExerciseSummary[],
  analyticsCtx?: ExerciseAnalyticsResolutionContext,
): void {
  const resolvedByLoggedId = new Map<string, ReturnType<typeof resolveExerciseIntelligenceForAnalytics>>();
  const resolveOne = (exerciseId: string, name: string) => {
    let row = resolvedByLoggedId.get(exerciseId);
    if (row == null) {
      row = resolveExerciseIntelligenceForAnalytics(exerciseId, analyticsCtx, {
        fallbackLoggedExerciseName: name,
      });
      resolvedByLoggedId.set(exerciseId, row);
    }
    return row;
  };

  for (const exercise of exercises) {
    const exerciseId = normalizeExerciseIdKey(exercise.exerciseId);
    if (exerciseId == null) continue;

    const volumeKg = trainingVolumeKgForManualExercise(exercise);
    const resolved = resolveOne(exerciseId, exercise.name);
    const contributions = resolved.contributions;

    const meta = getExerciseMeta(resolved.resolutionExerciseId);
    const equipKey = meta.equipment;
    const movementKey = resolved.movementPattern ?? meta.movement;

    if (Number.isFinite(volumeKg) && volumeKg > 0) {
      into.strengthTrainingVolumeKg += volumeKg;
      into.equipmentVolumeKg.set(equipKey, (into.equipmentVolumeKg.get(equipKey) ?? 0) + volumeKg);
      into.movementVolumeKg.set(movementKey, (into.movementVolumeKg.get(movementKey) ?? 0) + volumeKg);
    }

    if (
      resolved.hasContributionMap &&
      contributions != null &&
      contributions.length > 0 &&
      Number.isFinite(volumeKg) &&
      volumeKg > 0
    ) {
      for (const contribution of contributions) {
        const group = getMuscleGroupForSubgroup(contribution.subgroup);
        into.muscleVolumeKg.set(group, (into.muscleVolumeKg.get(group) ?? 0) + volumeKg * contribution.weight);
      }
    } else if (resolved.primaryMuscleGroup != null && Number.isFinite(volumeKg) && volumeKg > 0) {
      const g = resolved.primaryMuscleGroup;
      into.muscleVolumeKg.set(g, (into.muscleVolumeKg.get(g) ?? 0) + volumeKg);
    }

    const primary = resolved.primaryMuscleGroup;
    if (primary != null) {
      const contributingSets = countedNonWarmupSets(exercise);
      if (contributingSets > 0) {
        into.muscleSets.set(primary, (into.muscleSets.get(primary) ?? 0) + contributingSets);
      }
    }
  }
}

function finiteRecordFromMap(m: Map<string, number>): Record<string, number> | undefined {
  const o: Record<string, number> = {};
  for (const [k, v] of m) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) o[k] = v;
  }
  return Object.keys(o).length > 0 ? o : undefined;
}

function finiteRecordFromMuscleMap(m: Map<MuscleGroup, number>): Record<string, number> | undefined {
  const o: Record<string, number> = {};
  for (const [k, v] of m) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) o[k] = v;
  }
  return Object.keys(o).length > 0 ? o : undefined;
}

/** Returns null when no finite training volume was aggregated. */
export function serializeStrengthTaxonomyMaps(maps: StrengthTaxonomyAggregateMaps): StrengthTaxonomySerialized | null {
  if (!Number.isFinite(maps.strengthTrainingVolumeKg) || maps.strengthTrainingVolumeKg <= 0) return null;

  const muscleVolumeKgByGroup = finiteRecordFromMuscleMap(maps.muscleVolumeKg) ?? {};
  const muscleSetCountByGroup = finiteRecordFromMuscleMap(maps.muscleSets) ?? {};
  const movementVolumeKg = finiteRecordFromMap(maps.movementVolumeKg) ?? {};
  const equipmentVolumeKg = finiteRecordFromMap(maps.equipmentVolumeKg) ?? {};

  return {
    muscleVolumeKgByGroup,
    muscleSetCountByGroup,
    movementVolumeKg,
    equipmentVolumeKg,
    strengthTrainingVolumeKg: maps.strengthTrainingVolumeKg,
  };
}
