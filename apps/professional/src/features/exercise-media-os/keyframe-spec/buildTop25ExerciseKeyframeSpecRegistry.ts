import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { buildBenchPressKeyframeSpec } from "./buildBenchPressKeyframeSpec";
import { buildExerciseKeyframeSpecFromEnrichment } from "./buildExerciseKeyframeSpecFromEnrichment";
import type { ExerciseKeyframeSpec } from "./types";

export const TOP25_KEYFRAME_SPEC_REGISTRY_VERSION = "top25-keyframe-spec-registry-v1" as const;

const BENCH_PRESS_PILOT_EXERCISE_ID = "bench_press" as const;

function buildRegistrySpec(exerciseId: string): ExerciseKeyframeSpec | null {
  if (exerciseId === BENCH_PRESS_PILOT_EXERCISE_ID) {
    return buildBenchPressKeyframeSpec();
  }

  const { spec } = buildExerciseKeyframeSpecFromEnrichment(exerciseId);
  return spec;
}

/** Build the Top 25 keyframe spec registry in canonical enrichment order. */
export function buildTop25ExerciseKeyframeSpecRegistry(): readonly ExerciseKeyframeSpec[] {
  return TOP25_EXERCISE_ENRICHMENT_IDS.map((exerciseId) => buildRegistrySpec(exerciseId)).filter(
    (spec): spec is ExerciseKeyframeSpec => spec !== null,
  );
}

export function getTop25ExerciseKeyframeSpecByExerciseId(
  exerciseId: string,
): ExerciseKeyframeSpec | null {
  return specsByExerciseId.get(exerciseId) ?? null;
}

export function hasTop25ExerciseKeyframeSpec(exerciseId: string): boolean {
  return specsByExerciseId.has(exerciseId);
}

export function isBenchPressAuthoritativeKeyframeSpec(spec: ExerciseKeyframeSpec): boolean {
  return spec.exerciseId === BENCH_PRESS_PILOT_EXERCISE_ID;
}

export function listTop25ExerciseKeyframeSpecs(): readonly ExerciseKeyframeSpec[] {
  return [...REGISTRY_SPECS];
}

const REGISTRY_SPECS: readonly ExerciseKeyframeSpec[] = buildTop25ExerciseKeyframeSpecRegistry();

const specsByExerciseId = new Map<string, ExerciseKeyframeSpec>(
  REGISTRY_SPECS.map((spec) => [spec.exerciseId, spec]),
);

export const TOP25_EXERCISE_KEYFRAME_SPEC_IDS: readonly string[] = [...TOP25_EXERCISE_ENRICHMENT_IDS];

/** @deprecated Use getTop25ExerciseKeyframeSpecByExerciseId */
export function getExerciseKeyframeSpecById(exerciseId: string): ExerciseKeyframeSpec | null {
  return getTop25ExerciseKeyframeSpecByExerciseId(exerciseId);
}

/** @deprecated Use hasTop25ExerciseKeyframeSpec */
export function hasExerciseKeyframeSpec(exerciseId: string): boolean {
  return hasTop25ExerciseKeyframeSpec(exerciseId);
}
