/**
 * Deterministic rules for which lower-body classification slice owns an exercise.
 *
 * `PrimaryBucket` only has `"Legs"` (no Quads/Hamstrings/Glutes/Calves buckets), so slice
 * membership is derived from `primaryCoarse`, `movement`, and documented Back-bucket
 * exceptions — see `PRODUCT_RULES_LOWER_BODY_CLASSIFICATION.md`.
 */

import type { ExerciseLibraryItemV1 } from "./library.v1";
import { EXERCISE_LIBRARY_V1 } from "./library.v1";

export type LowerBodyMuscleSlice = "quads" | "hamstrings" | "glutes" | "calves";

/**
 * Back-bucket hinge rows where `primaryCoarse[0] === "Hamstrings"` (catalog hamstring-primary).
 * Included in the hamstrings classification slice despite `primaryBucket: "Back"`.
 */
export const BACK_BUCKET_HAMSTRINGS_SLICE_EXERCISE_IDS: readonly string[] = [
  "band_romanian_deadlift",
  "dumbbell_romanian_deadlift",
  "dumbbell_stiff_leg_deadlift",
  "kettlebell_romanian_deadlift",
  "romanian_deadlift",
  "single_leg_rdl_bodyweight",
  "stiff_leg_deadlift",
].sort((a, b) => a.localeCompare(b));

const BACK_HAMSTRINGS_SET = new Set(BACK_BUCKET_HAMSTRINGS_SLICE_EXERCISE_IDS);

/**
 * Assigns a `primaryBucket: "Legs"` row to exactly one lower-body muscle slice.
 */
export function assignLegsExerciseToLowerBodySlice(row: ExerciseLibraryItemV1): LowerBodyMuscleSlice {
  if (row.primaryBucket !== "Legs") {
    throw new Error(`assignLegsExerciseToLowerBodySlice: expected Legs bucket, got ${row.exerciseId}`);
  }
  const c = row.primaryCoarse;
  if (c[0] === "Calves") return "calves";
  if (c[0] === "Hamstrings") return "hamstrings";
  if (c[0] === "Glutes") return "glutes";
  if ((row.movement === "squat" || row.movement === "lunge") && c.includes("Quads")) {
    return "quads";
  }
  if (c[0] === "Hips") return "glutes";
  if (c[0] === "Legs") return "quads";
  return "quads";
}

export function getExpectedQuadsSliceExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Legs" && assignLegsExerciseToLowerBodySlice(row) === "quads") {
      out.push(row.exerciseId);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getExpectedHamstringsSliceExerciseIds(): string[] {
  const out: string[] = [...BACK_BUCKET_HAMSTRINGS_SLICE_EXERCISE_IDS];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Legs" && assignLegsExerciseToLowerBodySlice(row) === "hamstrings") {
      out.push(row.exerciseId);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getExpectedGlutesSliceExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Legs" && assignLegsExerciseToLowerBodySlice(row) === "glutes") {
      out.push(row.exerciseId);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function getExpectedCalvesSliceExerciseIds(): string[] {
  const out: string[] = [];
  for (const row of EXERCISE_LIBRARY_V1) {
    if (row.primaryBucket === "Legs" && assignLegsExerciseToLowerBodySlice(row) === "calves") {
      out.push(row.exerciseId);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function isHamstringsSliceExerciseId(exerciseId: string): boolean {
  if (BACK_HAMSTRINGS_SET.has(exerciseId)) return true;
  const row = EXERCISE_LIBRARY_V1.find((r) => r.exerciseId === exerciseId);
  if (row == null || row.primaryBucket !== "Legs") return false;
  return assignLegsExerciseToLowerBodySlice(row) === "hamstrings";
}
