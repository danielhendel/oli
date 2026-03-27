import { EXERCISE_LIBRARY_V1 } from "./library.v1";
import {
  getMuscleGroupForSubgroup,
  validateMuscleContributions,
  type MuscleContribution,
  type MuscleGroup,
} from "./taxonomy";

/**
 * Canonical first-wave exercise -> muscle contribution map.
 * Values are stable primitives for downstream aggregation and analytics logic.
 */
export const EXERCISE_MUSCLE_CONTRIBUTIONS_V1 = defineExerciseMuscleMap({
  bench_press: defineMuscleContributions([
    { subgroup: "mid_chest", weight: 0.55 },
    { subgroup: "triceps_long_head", weight: 0.25 },
    { subgroup: "front_delts", weight: 0.2 },
  ]),
  incline_bench_press: defineMuscleContributions([
    { subgroup: "upper_chest", weight: 0.5 },
    { subgroup: "front_delts", weight: 0.3 },
    { subgroup: "triceps_long_head", weight: 0.2 },
  ]),
  push_up: defineMuscleContributions([
    { subgroup: "mid_chest", weight: 0.5 },
    { subgroup: "triceps_long_head", weight: 0.25 },
    { subgroup: "front_delts", weight: 0.15 },
    { subgroup: "transverse_abdominis", weight: 0.1 },
  ]),
  overhead_press: defineMuscleContributions([
    { subgroup: "front_delts", weight: 0.5 },
    { subgroup: "triceps_long_head", weight: 0.3 },
    { subgroup: "lateral_delts", weight: 0.2 },
  ]),
  lateral_raise: defineMuscleContributions([
    { subgroup: "lateral_delts", weight: 0.8 },
    { subgroup: "upper_back", weight: 0.2 },
  ]),
  pull_up: defineMuscleContributions([
    { subgroup: "lats", weight: 0.55 },
    { subgroup: "biceps_long_head", weight: 0.25 },
    { subgroup: "upper_back", weight: 0.2 },
  ]),
  lat_pulldown: defineMuscleContributions([
    { subgroup: "lats", weight: 0.55 },
    { subgroup: "biceps_long_head", weight: 0.25 },
    { subgroup: "upper_back", weight: 0.2 },
  ]),
  barbell_row: defineMuscleContributions([
    { subgroup: "upper_back", weight: 0.4 },
    { subgroup: "lats", weight: 0.35 },
    { subgroup: "biceps_long_head", weight: 0.15 },
    { subgroup: "lower_back", weight: 0.1 },
  ]),
  seated_cable_row: defineMuscleContributions([
    { subgroup: "upper_back", weight: 0.45 },
    { subgroup: "lats", weight: 0.35 },
    { subgroup: "biceps_long_head", weight: 0.2 },
  ]),
  bicep_curl: defineMuscleContributions([
    { subgroup: "biceps_short_head", weight: 0.45 },
    { subgroup: "biceps_long_head", weight: 0.35 },
    { subgroup: "brachialis", weight: 0.2 },
  ]),
  hammer_curl: defineMuscleContributions([
    { subgroup: "brachialis", weight: 0.45 },
    { subgroup: "biceps_long_head", weight: 0.25 },
    { subgroup: "brachioradialis", weight: 0.3 },
  ]),
  tricep_pushdown: defineMuscleContributions([
    { subgroup: "triceps_lateral_head", weight: 0.45 },
    { subgroup: "triceps_long_head", weight: 0.3 },
    { subgroup: "triceps_medial_head", weight: 0.25 },
  ]),
  skull_crusher: defineMuscleContributions([
    { subgroup: "triceps_long_head", weight: 0.45 },
    { subgroup: "triceps_lateral_head", weight: 0.3 },
    { subgroup: "triceps_medial_head", weight: 0.25 },
  ]),
  squat: defineMuscleContributions([
    { subgroup: "rectus_femoris", weight: 0.3 },
    { subgroup: "vastus_lateralis", weight: 0.2 },
    { subgroup: "vastus_medialis", weight: 0.2 },
    { subgroup: "glute_max", weight: 0.2 },
    { subgroup: "spinal_erectors", weight: 0.1 },
  ]),
  leg_press: defineMuscleContributions([
    { subgroup: "rectus_femoris", weight: 0.3 },
    { subgroup: "vastus_lateralis", weight: 0.25 },
    { subgroup: "vastus_medialis", weight: 0.2 },
    { subgroup: "glute_max", weight: 0.15 },
    { subgroup: "biceps_femoris", weight: 0.1 },
  ]),
  leg_extension: defineMuscleContributions([
    { subgroup: "rectus_femoris", weight: 0.35 },
    { subgroup: "vastus_lateralis", weight: 0.25 },
    { subgroup: "vastus_medialis", weight: 0.25 },
    { subgroup: "vastus_intermedius", weight: 0.15 },
  ]),
  romanian_deadlift: defineMuscleContributions([
    { subgroup: "biceps_femoris", weight: 0.35 },
    { subgroup: "semitendinosus", weight: 0.2 },
    { subgroup: "semimembranosus", weight: 0.2 },
    { subgroup: "glute_max", weight: 0.15 },
    { subgroup: "spinal_erectors", weight: 0.1 },
  ]),
  leg_curl: defineMuscleContributions([
    { subgroup: "biceps_femoris", weight: 0.45 },
    { subgroup: "semitendinosus", weight: 0.3 },
    { subgroup: "semimembranosus", weight: 0.25 },
  ]),
  hip_thrust: defineMuscleContributions([
    { subgroup: "glute_max", weight: 0.6 },
    { subgroup: "biceps_femoris", weight: 0.2 },
    { subgroup: "semitendinosus", weight: 0.1 },
    { subgroup: "spinal_erectors", weight: 0.1 },
  ]),
  calf_raise: defineMuscleContributions([
    { subgroup: "gastrocnemius", weight: 0.6 },
    { subgroup: "soleus", weight: 0.4 },
  ]),
  hanging_leg_raise: defineMuscleContributions([
    { subgroup: "lower_abs", weight: 0.45 },
    { subgroup: "upper_abs", weight: 0.25 },
    { subgroup: "transverse_abdominis", weight: 0.2 },
    { subgroup: "obliques", weight: 0.1 },
  ]),
  plank: defineMuscleContributions([
    { subgroup: "transverse_abdominis", weight: 0.4 },
    { subgroup: "upper_abs", weight: 0.2 },
    { subgroup: "obliques", weight: 0.2 },
    { subgroup: "spinal_erectors", weight: 0.2 },
  ]),
});

const EXERCISE_MUSCLE_CONTRIBUTIONS_BY_ID: Readonly<Record<string, readonly MuscleContribution[]>> =
  EXERCISE_MUSCLE_CONTRIBUTIONS_V1;

export function defineMuscleContributions(
  contributions: readonly MuscleContribution[],
): readonly MuscleContribution[] {
  if (!validateMuscleContributions(contributions, { enforceTotalCap: true })) {
    throw new Error("Invalid muscle contributions: weights must be finite, >= 0, and total <= 1.");
  }
  return contributions;
}

function defineExerciseMuscleMap<T extends Record<string, readonly MuscleContribution[]>>(
  map: T,
): Readonly<T> {
  const libraryIds = new Set(EXERCISE_LIBRARY_V1.map((x) => x.exerciseId));
  for (const exerciseId of Object.keys(map)) {
    if (!libraryIds.has(exerciseId)) {
      throw new Error(`Invalid exerciseId in muscle contribution map: ${exerciseId}`);
    }
  }
  return map;
}

export function getExerciseMuscleContributions(
  exerciseId: string,
): readonly MuscleContribution[] | null {
  return EXERCISE_MUSCLE_CONTRIBUTIONS_BY_ID[exerciseId] ?? null;
}

export function getPrimaryMuscleGroupsForExercise(exerciseId: string): MuscleGroup[] {
  const contributions = getExerciseMuscleContributions(exerciseId);
  if (!contributions || contributions.length === 0) return [];
  const byGroup = new Map<MuscleGroup, number>();
  for (const entry of contributions) {
    const group = getMuscleGroupForSubgroup(entry.subgroup);
    byGroup.set(group, (byGroup.get(group) ?? 0) + entry.weight);
  }
  return [...byGroup.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([group]) => group);
}
