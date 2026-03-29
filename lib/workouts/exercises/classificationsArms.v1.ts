/**
 * Arms classification slices (v1).
 * One row per library entry with `primaryBucket: "Biceps"` or `"Triceps"`.
 *
 * `PrimaryBucket` has no `Forearms`; wrist/forearm work lives under **Biceps** in the catalog today.
 * The forearms registry stays empty until a catalog bucket exists.
 */

import type {
  BicepsExerciseClassificationV1,
  ForearmsExerciseClassificationV1,
  TricepsExerciseClassificationV1,
} from "./classificationTypes";
import { CLASSIFICATION_SCHEMA_VERSION } from "./classificationTypes";

const PREFER_MUSCLE_CONTRIBUTION_MAP = new Set([
  "bicep_curl",
  "hammer_curl",
  "tricep_pushdown",
  "skull_crusher",
]);

const J = {
  curlEw: ["elbow", "wrist"] as const,
  curlEws: ["elbow", "wrist", "shoulder"] as const,
  wristEw: ["wrist", "elbow"] as const,
  wristOnly: ["wrist"] as const,
  triElbow: ["elbow"] as const,
  triOh: ["elbow", "shoulder"] as const,
  triLying: ["elbow", "shoulder"] as const,
  triPress: ["elbow", "shoulder"] as const,
  triDip: ["elbow", "shoulder", "scapulothoracic"] as const,
  triPushBW: ["elbow", "shoulder", "scapulothoracic"] as const,
};

function bicepsRow(
  exerciseId: string,
  row: Omit<
    BicepsExerciseClassificationV1,
    "schemaVersion" | "categoryKey" | "primaryMuscleGroup" | "preferExistingMuscleContributionMap"
  >,
): [string, BicepsExerciseClassificationV1] {
  return [
    exerciseId,
    {
      schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
      categoryKey: "biceps",
      primaryMuscleGroup: "biceps",
      preferExistingMuscleContributionMap: PREFER_MUSCLE_CONTRIBUTION_MAP.has(exerciseId),
      ...row,
    },
  ];
}

function tricepsRow(
  exerciseId: string,
  row: Omit<
    TricepsExerciseClassificationV1,
    "schemaVersion" | "categoryKey" | "primaryMuscleGroup" | "preferExistingMuscleContributionMap"
  >,
): [string, TricepsExerciseClassificationV1] {
  return [
    exerciseId,
    {
      schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
      categoryKey: "triceps",
      primaryMuscleGroup: "triceps",
      preferExistingMuscleContributionMap: PREFER_MUSCLE_CONTRIBUTION_MAP.has(exerciseId),
      ...row,
    },
  ];
}

function bulkBiceps(
  ids: readonly string[],
  row: Omit<
    BicepsExerciseClassificationV1,
    "schemaVersion" | "categoryKey" | "primaryMuscleGroup" | "preferExistingMuscleContributionMap" | "notes"
  > & { notes?: string },
): [string, BicepsExerciseClassificationV1][] {
  return ids.map((id) => bicepsRow(id, row));
}

function bulkTriceps(
  ids: readonly string[],
  row: Omit<
    TricepsExerciseClassificationV1,
    "schemaVersion" | "categoryKey" | "primaryMuscleGroup" | "preferExistingMuscleContributionMap" | "notes"
  > & { notes?: string },
): [string, TricepsExerciseClassificationV1][] {
  return ids.map((id) => tricepsRow(id, row));
}

const BICEPS_ENTRIES: [string, BicepsExerciseClassificationV1][] = [
  ...bulkBiceps(["bicep_curl", "barbell_curl", "ez_bar_curl"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("dumbbell_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  ...bulkBiceps(["incline_dumbbell_curl", "dumbbell_incline_curl"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_incline_supinated",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("hammer_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_neutral",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("cable_hammer_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_neutral",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("band_hammer_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_neutral",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("cable_rope_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_neutral",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("dumbbell_incline_hammer_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_neutral",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "multi",
    jointsPrimary: J.curlEws,
  }),
  ...bulkBiceps(["preacher_curl", "ez_bar_preacher_curl"], {
    evidenceLevel: "library_derived",
    primaryPattern: "preacher_elbow_flexion",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("dumbbell_preacher_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "preacher_elbow_flexion",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("machine_preacher_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "preacher_elbow_flexion",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("band_preacher_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "preacher_elbow_flexion",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("concentration_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "concentration_elbow_flexion",
    laterality: "unilateral_each_side",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("cable_concentration_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "concentration_elbow_flexion",
    laterality: "unilateral_each_side",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("band_concentration_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "concentration_elbow_flexion",
    laterality: "unilateral_each_side",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("cable_bicep_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  ...bulkBiceps(["band_bicep_curl", "band_bicep_curl_supinated", "band_curl_supinated"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  ...bulkBiceps(["barbell_reverse_curl", "barbell_curl_reverse_grip"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_pronated",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("cable_reverse_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_pronated",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  ...bulkBiceps(["zottman_curl", "dumbbell_zottman_curl"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_mixed_rotation",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("dumbbell_wrist_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "wrist_flexion_forearm",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.wristEw,
  }),
  bicepsRow("barbell_wrist_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "wrist_flexion_forearm",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.wristEw,
  }),
  bicepsRow("dumbbell_reverse_wrist_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "wrist_extension_forearm",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.wristEw,
  }),
  bicepsRow("spider_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "spider_elbow_flexion",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("dumbbell_cross_body_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "cross_body_elbow_flexion",
    laterality: "unilateral_each_side",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "multi",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("cable_curl_high", {
    evidenceLevel: "library_derived",
    primaryPattern: "cable_elbow_flexion_high_line",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "multi",
    jointsPrimary: J.curlEws,
  }),
  bicepsRow("machine_bicep_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("single_arm_cable_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "unilateral_each_side",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("kettlebell_curl", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_flexion_supinated",
    laterality: "bilateral",
    loadModality: "kettlebell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.curlEw,
  }),
  bicepsRow("wrist_mobility", {
    evidenceLevel: "library_derived",
    primaryPattern: "wrist_mobility_arm",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "isolation",
    plane: "multi",
    jointsPrimary: J.wristOnly,
  }),
];

const TRICEPS_ENTRIES: [string, TricepsExerciseClassificationV1][] = [
  tricepsRow("tricep_pushdown", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_pushdown",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triElbow,
  }),
  ...bulkTriceps(["cable_tricep_pushdown_rope"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_pushdown",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triElbow,
  }),
  tricepsRow("cable_single_arm_tricep_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_pushdown",
    laterality: "unilateral_each_side",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triElbow,
  }),
  ...bulkTriceps(["band_tricep_pushdown", "band_close_grip_pushdown"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_pushdown",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triElbow,
  }),
  ...bulkTriceps(
    ["dumbbell_tricep_extension", "overhead_dumbbell_tricep_extension", "dumbbell_overhead_tricep_extension_seated"],
    {
      evidenceLevel: "library_derived",
      primaryPattern: "elbow_extension_overhead",
      laterality: "bilateral",
      loadModality: "dumbbell",
      compoundIsolation: "isolation",
      plane: "sagittal",
      jointsPrimary: J.triOh,
    },
  ),
  tricepsRow("cable_overhead_tricep_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_overhead",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triOh,
  }),
  tricepsRow("cable_single_arm_overhead_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_overhead",
    laterality: "unilateral_each_side",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triOh,
  }),
  tricepsRow("band_overhead_tricep_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_overhead",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triOh,
  }),
  ...bulkTriceps(["skull_crusher", "ez_bar_skull_crusher", "close_grip_ez_bar_skull_crusher"], {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_lying",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triLying,
  }),
  tricepsRow("cable_lying_tricep_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_lying",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triLying,
  }),
  tricepsRow("dumbbell_lying_tricep_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_lying",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triLying,
  }),
  tricepsRow("dumbbell_lying_tricep_extension_alternating", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_lying",
    laterality: "alternating",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triLying,
  }),
  tricepsRow("band_lying_tricep_extension", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_lying",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triLying,
  }),
  tricepsRow("dumbbell_kickback", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_kickback",
    laterality: "unilateral_each_side",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triOh,
  }),
  tricepsRow("band_tricep_kickback", {
    evidenceLevel: "library_derived",
    primaryPattern: "elbow_extension_kickback",
    laterality: "unilateral_each_side",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "sagittal",
    jointsPrimary: J.triOh,
  }),
  ...bulkTriceps(["close_grip_bench_press", "close_grip_incline_bench"], {
    evidenceLevel: "library_derived",
    primaryPattern: "compound_press_triceps_bias",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "compound",
    plane: "multi",
    jointsPrimary: J.triPress,
    notes: "Library lists chest as secondary coarse; triceps-biased press pattern.",
  }),
  tricepsRow("jm_press", {
    evidenceLevel: "library_derived",
    primaryPattern: "jm_press_pattern",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "compound",
    plane: "sagittal",
    jointsPrimary: J.triPress,
  }),
  tricepsRow("dip", {
    evidenceLevel: "library_derived",
    primaryPattern: "dip_pattern_triceps",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "compound",
    plane: "sagittal",
    jointsPrimary: J.triDip,
  }),
  tricepsRow("machine_tricep_dip", {
    evidenceLevel: "library_derived",
    primaryPattern: "dip_pattern_triceps",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "compound",
    plane: "sagittal",
    jointsPrimary: J.triDip,
  }),
  tricepsRow("ring_dip", {
    evidenceLevel: "library_derived",
    primaryPattern: "dip_pattern_triceps",
    laterality: "bilateral",
    loadModality: "bodyweight_rings",
    compoundIsolation: "compound",
    plane: "sagittal",
    jointsPrimary: J.triDip,
  }),
  ...bulkTriceps(["diamond_push_up", "sphinx_push_up"], {
    evidenceLevel: "library_derived",
    primaryPattern: "bodyweight_triceps_push_pattern",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "compound",
    plane: "multi",
    jointsPrimary: J.triPushBW,
  }),
];

export const BICEPS_CLASSIFICATION_BY_EXERCISE_ID: Readonly<
  Record<string, BicepsExerciseClassificationV1>
> = Object.fromEntries(BICEPS_ENTRIES);

export const TRICEPS_CLASSIFICATION_BY_EXERCISE_ID: Readonly<
  Record<string, TricepsExerciseClassificationV1>
> = Object.fromEntries(TRICEPS_ENTRIES);

/** Empty until `PrimaryBucket` gains `Forearms`. */
export const FOREARMS_CLASSIFICATION_BY_EXERCISE_ID: Readonly<
  Record<string, ForearmsExerciseClassificationV1>
> = {};

export function listBicepsClassificationExerciseIds(): readonly string[] {
  return Object.keys(BICEPS_CLASSIFICATION_BY_EXERCISE_ID).sort((a, b) => a.localeCompare(b));
}

export function listTricepsClassificationExerciseIds(): readonly string[] {
  return Object.keys(TRICEPS_CLASSIFICATION_BY_EXERCISE_ID).sort((a, b) => a.localeCompare(b));
}

export function listForearmsClassificationExerciseIds(): readonly string[] {
  return Object.keys(FOREARMS_CLASSIFICATION_BY_EXERCISE_ID).sort((a, b) => a.localeCompare(b));
}

