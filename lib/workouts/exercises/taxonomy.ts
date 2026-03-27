export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Kettlebell"
  | "Machine"
  | "Cable"
  | "Bodyweight"
  | "Band"
  | "MedicineBall"
  | "Sled"
  | "CardioMachine"
  | "Other";

/**
 * Refines "Machine" for gym-aware availability. Only used when equipment === "Machine".
 * Subtypes match actual catalog entries (e.g. machine_leg_press_vertical → LegPress).
 */
export type MachineSubtype =
  | "LegPress"
  | "LegExtension"
  | "LegCurl"
  | "CalfRaise"
  | "ChestPress"
  | "PecFly"
  | "ChestFly"
  | "ShoulderPress"
  | "LateralRaise"
  | "RearDeltFly"
  | "Pulldown"
  | "Row"
  | "BicepCurl"
  | "PreacherCurl"
  | "TricepDip"
  | "HipAbduction"
  | "HipAdduction"
  | "BackExtension"
  | "InclineChestPress"
  | "DeclineChestPress"
  | "VerticalChestPress"
  | "SmithMachine";

/**
 * Refines "CardioMachine" for gym-aware availability. Only used when equipment === "CardioMachine".
 */
export type CardioSubtype =
  | "Treadmill"
  | "Rower"
  | "StationaryBike"
  | "AssaultBike"
  | "Elliptical"
  | "StairClimber"
  | "SkiErg";

/** Optional refinement for Machine or CardioMachine. Improves trust of gym filtering. */
export type EquipmentSubtype = MachineSubtype | CardioSubtype;

/**
 * Small helper to turn an equipment subtype into a user-friendly label.
 * Keeps casing stable and inserts spaces between words (e.g. LegPress → "Leg press").
 */
export function formatEquipmentSubtypeLabel(subtype: EquipmentSubtype): string {
  const withSpaces = subtype.replace(/([A-Z])/g, " $1").trim();
  if (!withSpaces) return subtype;
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

/**
 * UI bucket labels (MUST remain stable to preserve existing UX).
 */
export type PrimaryBucket =
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Core"
  | "Full body";

/**
 * Coarse muscle groups (used for future filtering/analytics; NOT necessarily displayed yet).
 */
export type MuscleGroupCoarse =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Forearms"
  | "Core"
  | "Legs"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Hips"
  | "FullBody";

/**
 * Detailed/anatomical muscle groups (used for precision; NOT necessarily displayed yet).
 */
export type MuscleGroupDetailed =
  | "Pecs"
  | "UpperPecs"
  | "LowerPecs"
  | "Lats"
  | "Traps"
  | "UpperTraps"
  | "MidTraps"
  | "LowerTraps"
  | "Rhomboids"
  | "SpinalErectors"
  | "DeltsAnterior"
  | "DeltsMedial"
  | "DeltsPosterior"
  | "RotatorCuff"
  | "Biceps"
  | "Triceps"
  | "Brachialis"
  | "ForearmFlexors"
  | "ForearmExtensors"
  | "Abs"
  | "Obliques"
  | "TransverseAbdominis"
  | "HipFlexors"
  | "GluteMax"
  | "GluteMed"
  | "Adductors"
  | "Abductors"
  | "Quads"
  | "Hamstrings"
  | "Calves"
  | "TibialisAnterior";

/**
 * ---------------------------------------------------------------------------
 * Canonical Muscle Taxonomy (Workout Intelligence Foundation)
 * ---------------------------------------------------------------------------
 * This section defines the stable, canonical muscle taxonomy used by workout
 * intelligence features across Oli (stimulus tracking, weekly aggregation,
 * imbalance detection, plateau detection, and future response models).
 *
 * - `MuscleGroup`:
 *    User-facing rollup categories for dashboards and summaries.
 * - `MuscleSubgroup`:
 *    Internal physiological categories for exercise-level stimulus attribution.
 * - `MuscleContribution`:
 *    Weighted mapping primitive from an exercise signal to one or more
 *    subgroups.
 *
 * Naming strategy (stability-first):
 * - IDs are lowercase snake_case and treated as canonical analytics keys.
 * - Use anatomical names when they are unique and clear (e.g. `brachialis`,
 *   `rectus_femoris`, `lats`).
 * - Use namespaced IDs when collisions are plausible (e.g.
 *   `triceps_long_head`, `biceps_long_head`).
 *
 * These IDs should not be changed casually; downstream analytics and
 * historical comparability rely on deterministic naming.
 */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "triceps"
  | "biceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

/** Chest */
export type ChestMuscleSubgroup = "upper_chest" | "mid_chest" | "lower_chest";
/** Back */
export type BackMuscleSubgroup = "lats" | "upper_back" | "lower_back";
/** Shoulders */
export type ShouldersMuscleSubgroup = "front_delts" | "lateral_delts" | "rear_delts";
/** Triceps */
export type TricepsMuscleSubgroup =
  | "triceps_long_head"
  | "triceps_lateral_head"
  | "triceps_medial_head";
/** Biceps */
export type BicepsMuscleSubgroup =
  | "biceps_long_head"
  | "biceps_short_head"
  | "brachialis";
/** Forearms */
export type ForearmsMuscleSubgroup =
  | "forearm_flexors"
  | "forearm_extensors"
  | "brachioradialis";
/** Quads */
export type QuadsMuscleSubgroup =
  | "rectus_femoris"
  | "vastus_lateralis"
  | "vastus_medialis"
  | "vastus_intermedius";
/** Hamstrings */
export type HamstringsMuscleSubgroup =
  | "biceps_femoris"
  | "semitendinosus"
  | "semimembranosus";
/** Glutes */
export type GlutesMuscleSubgroup = "glute_max" | "glute_med" | "glute_min";
/** Calves */
export type CalvesMuscleSubgroup = "gastrocnemius" | "soleus";
/** Core */
export type CoreMuscleSubgroup =
  | "upper_abs"
  | "lower_abs"
  | "obliques"
  | "transverse_abdominis"
  | "spinal_erectors";

/**
 * Unified subgroup union used by exercise-to-muscle intelligence and rollups.
 */
export type MuscleSubgroup =
  | ChestMuscleSubgroup
  | BackMuscleSubgroup
  | ShouldersMuscleSubgroup
  | TricepsMuscleSubgroup
  | BicepsMuscleSubgroup
  | ForearmsMuscleSubgroup
  | QuadsMuscleSubgroup
  | HamstringsMuscleSubgroup
  | GlutesMuscleSubgroup
  | CalvesMuscleSubgroup
  | CoreMuscleSubgroup;

/**
 * Weighted per-exercise contribution to one subgroup.
 * `weight` is expected in [0, 1], interpreted relative to other entries.
 */
export type MuscleContribution = {
  subgroup: MuscleSubgroup;
  weight: number;
};

/**
 * Exhaustive canonical mapping from subgroup to user-facing group.
 */
export const subgroupToGroupMap: Record<MuscleSubgroup, MuscleGroup> = {
  upper_chest: "chest",
  mid_chest: "chest",
  lower_chest: "chest",
  lats: "back",
  upper_back: "back",
  lower_back: "back",
  front_delts: "shoulders",
  lateral_delts: "shoulders",
  rear_delts: "shoulders",
  triceps_long_head: "triceps",
  triceps_lateral_head: "triceps",
  triceps_medial_head: "triceps",
  biceps_long_head: "biceps",
  biceps_short_head: "biceps",
  brachialis: "biceps",
  forearm_flexors: "forearms",
  forearm_extensors: "forearms",
  brachioradialis: "forearms",
  rectus_femoris: "quads",
  vastus_lateralis: "quads",
  vastus_medialis: "quads",
  vastus_intermedius: "quads",
  biceps_femoris: "hamstrings",
  semitendinosus: "hamstrings",
  semimembranosus: "hamstrings",
  glute_max: "glutes",
  glute_med: "glutes",
  glute_min: "glutes",
  gastrocnemius: "calves",
  soleus: "calves",
  upper_abs: "core",
  lower_abs: "core",
  obliques: "core",
  transverse_abdominis: "core",
  spinal_erectors: "core",
};

const MUSCLE_SUBGROUP_SET: ReadonlySet<MuscleSubgroup> = new Set(
  Object.keys(subgroupToGroupMap) as MuscleSubgroup[],
);

export function isMuscleSubgroup(value: string): value is MuscleSubgroup {
  return MUSCLE_SUBGROUP_SET.has(value as MuscleSubgroup);
}

export function getMuscleGroupForSubgroup(subgroup: MuscleSubgroup): MuscleGroup {
  return subgroupToGroupMap[subgroup];
}

type ValidateMuscleContributionsOptions = {
  /** When true, rejects contribution sets whose total weight exceeds 1.0 (+epsilon). */
  enforceTotalCap?: boolean;
  epsilon?: number;
};

export function validateMuscleContributions(
  contributions: readonly MuscleContribution[],
  opts?: ValidateMuscleContributionsOptions,
): boolean {
  const epsilon = opts?.epsilon ?? 1e-9;
  let total = 0;
  for (const row of contributions) {
    if (!Number.isFinite(row.weight) || row.weight < 0) return false;
    total += row.weight;
  }
  if (opts?.enforceTotalCap === true && total > 1 + epsilon) return false;
  return true;
}
