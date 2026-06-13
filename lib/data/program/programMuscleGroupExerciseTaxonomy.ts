// lib/data/program/programMuscleGroupExerciseTaxonomy.ts
/**
 * Bridge between the Program Design muscle taxonomy (`ProgramDesignMuscleGroup`) and the existing
 * exercise library taxonomy (`MuscleGroupDetailed` tags on `ExerciseLibraryItemV1`).
 *
 * The two taxonomies were authored independently; this is the single, deterministic mapping that
 * lets the Program Builder pull real exercises for a given program muscle group WITHOUT inventing a
 * second library. Pure data only — no IO, no React.
 *
 * Integrity: this module only READS `EXERCISE_LIBRARY_V1`. It never mutates exercise ids, names, or
 * definitions, and it filters to `status === "active"` so retired/archived ids are not recommended
 * (historical logs that reference them still resolve via the library's display-name layer).
 */
import {
  EXERCISE_LIBRARY_V1,
  type ExerciseLibraryItemV1,
} from "@/lib/workouts/exercises/library.v1";
import type { MuscleGroupDetailed } from "@/lib/workouts/exercises/taxonomy";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";

/**
 * Detailed exercise-library muscle tags that correspond to each Program Design muscle group. A
 * library exercise is a candidate for the group when its `primaryDetailed` (preferred) or
 * `secondaryDetailed` tags intersect this set.
 *
 * `neck` has no tag in the exercise taxonomy yet → no candidates (reported as needing expansion).
 */
export const PROGRAM_MUSCLE_GROUP_TO_DETAILED: Record<
  ProgramDesignMuscleGroup,
  readonly MuscleGroupDetailed[]
> = {
  upper_chest: ["UpperPecs"],
  mid_chest: ["Pecs", "LowerPecs"],
  lats: ["Lats"],
  upper_back: ["MidTraps", "Rhomboids", "UpperTraps", "Traps"],
  front_delts: ["DeltsAnterior"],
  side_delts: ["DeltsMedial"],
  rear_delts: ["DeltsPosterior"],
  triceps: ["Triceps"],
  biceps: ["Biceps", "Brachialis"],
  quads: ["Quads"],
  hamstrings: ["Hamstrings"],
  glutes: ["GluteMax", "GluteMed"],
  calves: ["Calves"],
  abs: ["Abs", "Obliques", "TransverseAbdominis"],
  lower_traps: ["LowerTraps"],
  rotator_cuff: ["RotatorCuff"],
  adductors: ["Adductors"],
  forearms: ["ForearmFlexors", "ForearmExtensors", "Brachialis"],
  neck: [],
  tibialis: ["TibialisAnterior"],
};

/** A library exercise that targets a muscle group, tagged by whether the match is primary. */
export type ExerciseLibraryCandidate = {
  item: ExerciseLibraryItemV1;
  isPrimaryMatch: boolean;
};

/** Active bundled exercises only (retired/archived rows are excluded from recommendations). */
const ACTIVE_LIBRARY: readonly ExerciseLibraryItemV1[] = EXERCISE_LIBRARY_V1.filter(
  (x) => x.status === "active",
);

/**
 * Return the active library exercises that target a Program Design muscle group, primary matches
 * first (in library declaration order, which is stable → deterministic), then secondary matches.
 */
export function getLibraryCandidatesForMuscleGroup(
  muscleGroupId: ProgramDesignMuscleGroup,
): ExerciseLibraryCandidate[] {
  const tags = PROGRAM_MUSCLE_GROUP_TO_DETAILED[muscleGroupId];
  if (tags.length === 0) return [];
  const tagSet = new Set<MuscleGroupDetailed>(tags);

  const primary: ExerciseLibraryCandidate[] = [];
  const secondary: ExerciseLibraryCandidate[] = [];
  for (const item of ACTIVE_LIBRARY) {
    if (item.primaryDetailed.some((d) => tagSet.has(d))) {
      primary.push({ item, isPrimaryMatch: true });
    } else if (item.secondaryDetailed.some((d) => tagSet.has(d))) {
      secondary.push({ item, isPrimaryMatch: false });
    }
  }
  return [...primary, ...secondary];
}
