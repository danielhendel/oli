/**
 * Shoulders classification slice (v1).
 * One row per `EXERCISE_LIBRARY_V1` entry with `primaryBucket: "Shoulders"`.
 */

import type { ShoulderExerciseClassificationV1 } from "./classificationTypes";
import { CLASSIFICATION_SCHEMA_VERSION } from "./classificationTypes";

const PREFER_MUSCLE_CONTRIBUTION_MAP = new Set(["overhead_press", "lateral_raise"]);

const J = {
  gh: ["shoulder", "elbow", "scapulothoracic"] as const,
  ghWrist: ["shoulder", "elbow", "wrist", "scapulothoracic"] as const,
};

function shoulderRow(
  exerciseId: string,
  row: Omit<
    ShoulderExerciseClassificationV1,
    "schemaVersion" | "categoryKey" | "primaryMuscleGroup" | "preferExistingMuscleContributionMap"
  >,
): [string, ShoulderExerciseClassificationV1] {
  return [
    exerciseId,
    {
      schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
      categoryKey: "shoulders",
      primaryMuscleGroup: "shoulders",
      preferExistingMuscleContributionMap: PREFER_MUSCLE_CONTRIBUTION_MAP.has(exerciseId),
      ...row,
    },
  ];
}

function bulk(
  ids: readonly string[],
  row: Omit<
    ShoulderExerciseClassificationV1,
    "schemaVersion" | "categoryKey" | "primaryMuscleGroup" | "preferExistingMuscleContributionMap" | "notes"
  > & { notes?: string },
): [string, ShoulderExerciseClassificationV1][] {
  return ids.map((id) => shoulderRow(id, row));
}

const ENTRIES: [string, ShoulderExerciseClassificationV1][] = [
  ...bulk(["overhead_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["dumbbell_overhead_press", "dumbbell_shoulder_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["arnold_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_arnold",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
    notes: "Frontal-to-overhead rotation; still catalogued as shoulder press family.",
  }),
  ...bulk(["machine_shoulder_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["smith_machine_shoulder_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "bilateral",
    loadModality: "machine_smith",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["single_arm_overhead_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "unilateral_each_side",
    loadModality: "dumbbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_shoulder_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["kettlebell_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_overhead",
    laterality: "bilateral",
    loadModality: "kettlebell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.ghWrist,
  }),
  ...bulk(["push_press"], {
    evidenceLevel: "library_derived",
    primaryPattern: "vertical_press_push_power",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
    notes: "Leg drive assist; still shoulder-primary bucket in library.",
  }),
  ...bulk(["handstand_push_up", "pike_push_up", "decline_pike_push_up"], {
    evidenceLevel: "library_derived",
    primaryPattern: "overhead_calisthenics_press",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["wall_handstand_hold"], {
    evidenceLevel: "library_derived",
    primaryPattern: "isometric_overhead_hold",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "mixed",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["crow_pose", "frog_stand", "planche_lean", "tuck_planche_hold", "wall_walk"], {
    evidenceLevel: "library_derived",
    primaryPattern: "shoulder_skill_balance",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "mixed",
    plane: "multi",
    jointsPrimary: J.gh,
    notes: "Skill/balance emphasis; detailed stress varies by hold.",
  }),
  ...bulk(["lateral_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_lateral",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["cable_lateral_raise", "cable_standing_lateral_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_lateral",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_lateral_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_lateral",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["barbell_lateral_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_lateral",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["machine_lateral_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_lateral",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["barbell_front_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_front",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["dumbbell_front_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_front",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["cable_front_raise"], {
    evidenceLevel: "library_derived",
    primaryPattern: "raise_front",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["rear_delt_fly", "dumbbell_bent_over_lateral_raise", "dumbbell_reverse_fly_incline"], {
    evidenceLevel: "library_derived",
    primaryPattern: "rear_delt_horizontal_abduction",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "horizontal_rear",
    jointsPrimary: J.gh,
    notes: "Posterior delt / horizontal abduction line; upper-back overlap deferred to library detailed tags.",
  }),
  ...bulk(["cable_rear_delt_fly"], {
    evidenceLevel: "library_derived",
    primaryPattern: "rear_delt_horizontal_abduction",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "isolation",
    plane: "horizontal_rear",
    jointsPrimary: J.gh,
  }),
  ...bulk(["machine_rear_delt_fly"], {
    evidenceLevel: "library_derived",
    primaryPattern: "rear_delt_horizontal_abduction",
    laterality: "bilateral",
    loadModality: "machine_selectorized",
    compoundIsolation: "isolation",
    plane: "horizontal_rear",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_rear_delt_fly", "band_reverse_fly"], {
    evidenceLevel: "library_derived",
    primaryPattern: "rear_delt_horizontal_abduction",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "horizontal_rear",
    jointsPrimary: J.gh,
  }),
  ...bulk(["upright_row"], {
    evidenceLevel: "library_derived",
    primaryPattern: "upright_row",
    laterality: "bilateral",
    loadModality: "barbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
    notes: "Library lists upper traps; shoulder-primary bucket per catalog—impingement risk is product/education, not encoded here.",
  }),
  ...bulk(["dumbbell_upright_row"], {
    evidenceLevel: "library_derived",
    primaryPattern: "upright_row",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["cable_upright_row"], {
    evidenceLevel: "library_derived",
    primaryPattern: "upright_row",
    laterality: "bilateral",
    loadModality: "cable",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_upright_row"], {
    evidenceLevel: "library_derived",
    primaryPattern: "upright_row",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "compound",
    plane: "vertical",
    jointsPrimary: J.gh,
  }),
  ...bulk(["dumbbell_scaption"], {
    evidenceLevel: "library_derived",
    primaryPattern: "scaption_raise",
    laterality: "bilateral",
    loadModality: "dumbbell",
    compoundIsolation: "isolation",
    plane: "scapular_plane",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_scaption"], {
    evidenceLevel: "library_derived",
    primaryPattern: "scaption_raise",
    laterality: "bilateral",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "scapular_plane",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_external_rotation"], {
    evidenceLevel: "library_derived",
    primaryPattern: "rotator_external_rotation",
    laterality: "unilateral_each_side",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["band_internal_rotation"], {
    evidenceLevel: "library_derived",
    primaryPattern: "rotator_internal_rotation",
    laterality: "unilateral_each_side",
    loadModality: "band",
    compoundIsolation: "isolation",
    plane: "horizontal_front",
    jointsPrimary: J.gh,
  }),
  ...bulk(["arm_circle"], {
    evidenceLevel: "library_derived",
    primaryPattern: "mobility_shoulder_circle",
    laterality: "bilateral",
    loadModality: "bodyweight",
    compoundIsolation: "isolation",
    plane: "multi",
    jointsPrimary: J.gh,
  }),
  ...bulk(["kettlebell_halo"], {
    evidenceLevel: "library_derived",
    primaryPattern: "mobility_shoulder_rotation_halo",
    laterality: "bilateral",
    loadModality: "kettlebell",
    compoundIsolation: "isolation",
    plane: "multi",
    jointsPrimary: J.ghWrist,
  }),
];

export const SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID: Readonly<
  Record<string, ShoulderExerciseClassificationV1>
> = Object.fromEntries(ENTRIES);

export function listShouldersClassificationExerciseIds(): readonly string[] {
  return Object.keys(SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID).sort((a, b) => a.localeCompare(b));
}

