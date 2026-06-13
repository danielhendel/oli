// lib/data/program/programmingEngineBaseVolume.ts
/**
 * Base weekly set-volume tables for the Programming Engine (sex × training level).
 *
 * Pure data + pure functions only (no IO, no React, no Firebase/API). These are the engine's
 * starting point (step 1: "Load base volume table by sex + level"). Training-type multipliers
 * (step 2) and the chest/back canonical split (steps 3–4) are applied downstream.
 *
 * TAXONOMY MAPPING — the base tables use coarse "Chest" / "Back" buckets, but the Program Design
 * canonical taxonomy splits these (see {@link ProgramDesignMuscleGroup}):
 *  - Chest total → Upper Chest + Mid Chest. Even split; the odd extra set goes to PRIMARY Mid Chest.
 *  - Back  total → Lats + Upper Back. Even split; the odd extra set goes to PRIMARY Lats.
 *  - All other buckets map 1:1 to a canonical group.
 *  - Canonical groups with no base bucket (lower_traps, rotator_cuff, adductors, forearms, neck,
 *    tibialis) stay 0 unless the user manually adjusts them.
 *
 * Distribution is total-preserving: split = { primary: ceil(total/2), secondary: floor(total/2) }.
 */
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignTrainingLevel,
  ProgramVolumeSex,
} from "@/lib/data/program/workoutProgramDesignTypes";

/** Coarse base-table buckets (12). Chest/Back are split into canonical groups on expand. */
export type BaseVolumeMuscle =
  | "chest"
  | "back"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "calves"
  | "abs";

/** A complete base table: target sets per coarse bucket. */
export type BaseVolumeTemplate = Record<BaseVolumeMuscle, number>;

/**
 * Master base-volume table. Values are transcribed exactly from the product spec; documented
 * totals are asserted in tests (e.g. Male Intermediate = 129, Female Elite = 194).
 */
export const BASE_VOLUME_TABLES: Record<
  ProgramVolumeSex,
  Record<ProgramDesignTrainingLevel, BaseVolumeTemplate>
> = {
  male: {
    beginner: {
      chest: 8, back: 10, quads: 8, hamstrings: 6, glutes: 4, front_delts: 2,
      side_delts: 4, rear_delts: 4, biceps: 6, triceps: 6, calves: 6, abs: 6,
    },
    novice: {
      chest: 10, back: 12, quads: 10, hamstrings: 8, glutes: 6, front_delts: 2,
      side_delts: 6, rear_delts: 6, biceps: 8, triceps: 8, calves: 8, abs: 8,
    },
    intermediate: {
      chest: 14, back: 16, quads: 14, hamstrings: 12, glutes: 8, front_delts: 3,
      side_delts: 10, rear_delts: 10, biceps: 10, triceps: 10, calves: 12, abs: 10,
    },
    advanced: {
      chest: 16, back: 20, quads: 16, hamstrings: 14, glutes: 10, front_delts: 4,
      side_delts: 16, rear_delts: 12, biceps: 12, triceps: 12, calves: 16, abs: 12,
    },
    elite: {
      chest: 18, back: 22, quads: 18, hamstrings: 16, glutes: 12, front_delts: 4,
      side_delts: 20, rear_delts: 16, biceps: 14, triceps: 14, calves: 20, abs: 14,
    },
  },
  female: {
    beginner: {
      chest: 6, back: 10, quads: 10, hamstrings: 8, glutes: 12, front_delts: 1,
      side_delts: 4, rear_delts: 4, biceps: 6, triceps: 6, calves: 6, abs: 6,
    },
    novice: {
      chest: 8, back: 12, quads: 12, hamstrings: 10, glutes: 16, front_delts: 1,
      side_delts: 6, rear_delts: 6, biceps: 8, triceps: 8, calves: 8, abs: 8,
    },
    intermediate: {
      chest: 10, back: 16, quads: 16, hamstrings: 12, glutes: 20, front_delts: 2,
      side_delts: 10, rear_delts: 10, biceps: 10, triceps: 10, calves: 10, abs: 10,
    },
    advanced: {
      chest: 10, back: 18, quads: 18, hamstrings: 14, glutes: 24, front_delts: 2,
      side_delts: 16, rear_delts: 12, biceps: 12, triceps: 12, calves: 12, abs: 12,
    },
    elite: {
      chest: 12, back: 22, quads: 20, hamstrings: 16, glutes: 28, front_delts: 2,
      side_delts: 20, rear_delts: 16, biceps: 14, triceps: 14, calves: 16, abs: 14,
    },
  },
};

/** Return the coarse base table for a sex + level. */
export function getBaseVolume(
  sex: ProgramVolumeSex,
  level: ProgramDesignTrainingLevel,
): BaseVolumeTemplate {
  return BASE_VOLUME_TABLES[sex][level];
}

/** Documented total for a base table (sum of coarse buckets). */
export function getBaseVolumeTotal(
  sex: ProgramVolumeSex,
  level: ProgramDesignTrainingLevel,
): number {
  return Object.values(getBaseVolume(sex, level)).reduce<number>((t, n) => t + n, 0);
}

/**
 * Split a coarse total across two canonical groups. Even split when possible; on an odd total
 * the extra set goes to `primary`. Total-preserving: primary + secondary === total.
 */
export function splitCoarseVolume(
  total: number,
  primary: ProgramDesignMuscleGroup,
  secondary: ProgramDesignMuscleGroup,
): Partial<Record<ProgramDesignMuscleGroup, number>> {
  const half = Math.floor(total / 2);
  const extra = total - half * 2; // 0 or 1
  return { [primary]: half + extra, [secondary]: half };
}

/** Canonical destination for each 1:1 base bucket (chest/back handled separately). */
const DIRECT_BASE_MAPPING: Record<
  Exclude<BaseVolumeMuscle, "chest" | "back">,
  ProgramDesignMuscleGroup
> = {
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  front_delts: "front_delts",
  side_delts: "side_delts",
  rear_delts: "rear_delts",
  biceps: "biceps",
  triceps: "triceps",
  calves: "calves",
  abs: "abs",
};

/**
 * Expand a (possibly multiplier-scaled) coarse base table into the canonical 20-group map.
 *
 * Chest → Mid Chest (+odd extra) + Upper Chest; Back → Lats (+odd extra) + Upper Back; all other
 * buckets map 1:1. Returns a sparse map containing only populated (>0) groups; groups not present
 * in the table are omitted (i.e. 0 / "Not set" unless overridden).
 */
export function expandBaseToCanonical(
  table: BaseVolumeTemplate,
): Partial<Record<ProgramDesignMuscleGroup, number>> {
  const map: Partial<Record<ProgramDesignMuscleGroup, number>> = {};

  for (const [muscle, sets] of Object.entries(
    splitCoarseVolume(table.chest, "mid_chest", "upper_chest"),
  )) {
    if (sets && sets > 0) map[muscle as ProgramDesignMuscleGroup] = sets;
  }
  for (const [muscle, sets] of Object.entries(
    splitCoarseVolume(table.back, "lats", "upper_back"),
  )) {
    if (sets && sets > 0) map[muscle as ProgramDesignMuscleGroup] = sets;
  }

  for (const bucket of Object.keys(DIRECT_BASE_MAPPING) as (keyof typeof DIRECT_BASE_MAPPING)[]) {
    const sets = table[bucket];
    if (sets > 0) map[DIRECT_BASE_MAPPING[bucket]] = sets;
  }

  return map;
}
