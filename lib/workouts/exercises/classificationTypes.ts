/**
 * Additive exercise classification (Health OS intelligence layer).
 * Keys off `exerciseId` from EXERCISE_LIBRARY_V1; does not replace the catalog.
 */

export const CLASSIFICATION_SCHEMA_VERSION = 1 as const;

export type EvidenceLevel = "library_derived" | "heuristic" | "expert_curated";

/**
 * Chest-specific movement patterns (finer than library `movement: MovementPattern`).
 * Complements — does not replace — metadata.movement for filtering/analytics.
 */
export type ChestMovementPattern =
  | "horizontal_press"
  | "incline_press"
  | "decline_press"
  | "fly_adduction"
  | "cable_crossover"
  | "push_up"
  | "floor_press"
  | "pullover"
  | "mobility_stretch"
  | "power_chest_throw";

/**
 * Back-specific movement patterns (finer than library `movement`).
 */
export type BackMovementPattern =
  | "pull_vertical"
  | "pull_horizontal_row"
  | "hip_hinge_pull"
  | "hip_extension_spinal"
  | "shrug_vertical"
  | "face_pull_external_rotation"
  | "scapular_isolation_raise"
  | "scapular_retraction_horizontal"
  | "scapular_stability_mobility"
  | "mobility_flexion"
  | "mobility_extension"
  | "mobility_rotation"
  | "mobility_segmental_spine"
  | "isometric_hold_spinal"
  | "isometric_hold_vertical_pull"
  | "rope_climb_vertical";

/**
 * Shoulder-specific movement patterns (finer than library `movement`).
 */
export type ShoulderMovementPattern =
  | "vertical_press_overhead"
  | "vertical_press_arnold"
  | "vertical_press_push_power"
  | "raise_lateral"
  | "raise_front"
  | "rear_delt_horizontal_abduction"
  | "upright_row"
  | "scaption_raise"
  | "rotator_external_rotation"
  | "rotator_internal_rotation"
  | "overhead_calisthenics_press"
  | "shoulder_skill_balance"
  | "isometric_overhead_hold"
  | "mobility_shoulder_circle"
  | "mobility_shoulder_rotation_halo";

/** Biceps-bucket movement patterns (library `primaryBucket: "Biceps"`). */
export type BicepsMovementPattern =
  | "elbow_flexion_supinated"
  | "elbow_flexion_neutral"
  | "elbow_flexion_pronated"
  | "elbow_flexion_mixed_rotation"
  | "elbow_flexion_incline_supinated"
  | "preacher_elbow_flexion"
  | "concentration_elbow_flexion"
  | "cable_elbow_flexion_high_line"
  | "spider_elbow_flexion"
  | "cross_body_elbow_flexion"
  | "wrist_flexion_forearm"
  | "wrist_extension_forearm"
  | "wrist_mobility_arm";

/** Triceps-bucket movement patterns (library `primaryBucket: "Triceps"`). */
export type TricepsMovementPattern =
  | "elbow_extension_pushdown"
  | "elbow_extension_overhead"
  | "elbow_extension_lying"
  | "elbow_extension_kickback"
  | "compound_press_triceps_bias"
  | "jm_press_pattern"
  | "dip_pattern_triceps"
  | "bodyweight_triceps_push_pattern";

/**
 * Forearms-bucket patterns for future catalog entries.
 * Current `PrimaryBucket` union has no `Forearms`; registry may be empty (v1).
 */
export type ForearmsMovementPattern =
  | "wrist_flexion"
  | "wrist_extension"
  | "pronation_supination"
  | "grip_crush"
  | "grip_hold"
  | "carry_grip"
  | "reverse_curl_forearm_bias";

export type ClassificationLaterality = "bilateral" | "alternating" | "unilateral_each_side";

/**
 * Load / implement modality for intelligence (maps from library Equipment where possible).
 */
export type ClassificationLoadModality =
  | "barbell"
  | "dumbbell"
  | "machine_selectorized"
  | "machine_smith"
  | "cable"
  | "band"
  | "bodyweight"
  | "bodyweight_rings"
  | "kettlebell"
  | "medicine_ball"
  | "other";

export type CompoundIsolation = "compound" | "isolation" | "mixed";

/** Planes for chest-focused work. */
export type ChestPlane = "horizontal" | "incline" | "decline" | "transverse_adduction" | "multi" | "na";

/** Planes / vectors for back-focused work. */
export type BackPlane = "vertical" | "horizontal" | "sagittal_hinge" | "transverse" | "multi" | "na";

/** Planes / vectors for shoulder-focused work. */
export type ShoulderPlane = "vertical" | "horizontal_front" | "horizontal_rear" | "scapular_plane" | "multi" | "na";

/** Planes for arm (elbow/wrist) emphasis. */
export type ArmPlane = "sagittal" | "frontal" | "multi" | "na";

/** Lightweight joint tags for v1 tissue/joint relevance (not a medical ontology). */
export type ClassificationJointId =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "scapulothoracic"
  | "spine"
  | "hip"
  | "knee"
  | "ankle";

type ClassificationBase = {
  schemaVersion: typeof CLASSIFICATION_SCHEMA_VERSION;
  evidenceLevel: EvidenceLevel;
  laterality: ClassificationLaterality;
  loadModality: ClassificationLoadModality;
  compoundIsolation: CompoundIsolation;
  /**
   * When true, consumers with access to `EXERCISE_MUSCLE_CONTRIBUTIONS_V1`
   * should prefer that map for weighted subgroup analytics when non-null.
   */
  preferExistingMuscleContributionMap: boolean;
  jointsPrimary: readonly ClassificationJointId[];
  notes?: string;
};

export type ChestExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "chest";
  primaryMuscleGroup: "chest";
  primaryPattern: ChestMovementPattern;
  secondaryPatterns?: ChestMovementPattern[];
  plane: ChestPlane;
};

export type BackExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "back";
  primaryMuscleGroup: "back";
  primaryPattern: BackMovementPattern;
  secondaryPatterns?: BackMovementPattern[];
  plane: BackPlane;
};

export type ShoulderExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "shoulders";
  primaryMuscleGroup: "shoulders";
  primaryPattern: ShoulderMovementPattern;
  secondaryPatterns?: ShoulderMovementPattern[];
  plane: ShoulderPlane;
};

export type BicepsExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "biceps";
  primaryMuscleGroup: "biceps";
  primaryPattern: BicepsMovementPattern;
  secondaryPatterns?: BicepsMovementPattern[];
  plane: ArmPlane;
};

export type TricepsExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "triceps";
  primaryMuscleGroup: "triceps";
  primaryPattern: TricepsMovementPattern;
  secondaryPatterns?: TricepsMovementPattern[];
  plane: ArmPlane;
};

export type ForearmsExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "forearms";
  primaryMuscleGroup: "forearms";
  primaryPattern: ForearmsMovementPattern;
  secondaryPatterns?: ForearmsMovementPattern[];
  plane: ArmPlane;
};

/** Planes for lower-body emphasis (sagittal squat/hinge vs frontal abduction). */
export type LegPlane = "sagittal" | "frontal" | "transverse" | "multi" | "na";

export type QuadsMovementPattern =
  | "squat_pattern"
  | "lunge_pattern"
  | "knee_extension_isolation"
  | "leg_press_pattern"
  | "sled_push_pattern"
  | "conditioning_gait_quads"
  | "cardio_cycling_quads"
  | "mobility_stretch_quad";

export type HamstringsMovementPattern =
  | "hip_hinge_posterior"
  | "knee_flexion_curl"
  | "nordic_knee_flexion"
  | "glute_ham_raise_pattern"
  | "mobility_stretch_hamstring";

export type GlutesMovementPattern =
  | "hip_thrust_bridge_pattern"
  | "hip_abduction"
  | "hip_adduction"
  | "kickback_extension"
  | "lunge_glute_bias"
  | "mobility_stretch_hip";

export type CalvesMovementPattern =
  | "plantarflexion_standing"
  | "plantarflexion_seated"
  | "plantarflexion_leg_press"
  | "dorsiflexion_tibialis"
  | "mobility_stretch_calf";

export type QuadsExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "quads";
  primaryMuscleGroup: "quads";
  primaryPattern: QuadsMovementPattern;
  secondaryPatterns?: QuadsMovementPattern[];
  plane: LegPlane;
};

export type HamstringsExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "hamstrings";
  primaryMuscleGroup: "hamstrings";
  primaryPattern: HamstringsMovementPattern;
  secondaryPatterns?: HamstringsMovementPattern[];
  plane: LegPlane;
};

export type GlutesExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "glutes";
  primaryMuscleGroup: "glutes";
  primaryPattern: GlutesMovementPattern;
  secondaryPatterns?: GlutesMovementPattern[];
  plane: LegPlane;
};

export type CalvesExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "calves";
  primaryMuscleGroup: "calves";
  primaryPattern: CalvesMovementPattern;
  secondaryPatterns?: CalvesMovementPattern[];
  plane: LegPlane;
};

/** Planes for trunk / core work. */
export type CorePlane = "sagittal" | "frontal" | "transverse" | "multi" | "na";

export type CoreMovementPattern =
  | "trunk_flexion"
  | "trunk_rotation"
  | "anti_rotation"
  | "anti_extension_rollout"
  | "anti_lateral_flexion"
  | "trunk_stability_hold"
  | "hollow_body_hold"
  | "hip_flexion_emphasis_core"
  | "loaded_carry_core"
  | "spinal_mobility_trunk"
  | "lateral_trunk_flexion"
  | "rotational_power_throw"
  | "gymnastics_compression_hold"
  | "conditioning_core_mixed";

export type CoreExerciseClassificationV1 = ClassificationBase & {
  categoryKey: "core";
  primaryMuscleGroup: "core";
  primaryPattern: CoreMovementPattern;
  secondaryPatterns?: CoreMovementPattern[];
  plane: CorePlane;
};

/** Discriminated union of per-category classification rows (v1 rollout). */
export type ExerciseClassificationV1 =
  | ChestExerciseClassificationV1
  | BackExerciseClassificationV1
  | ShoulderExerciseClassificationV1
  | BicepsExerciseClassificationV1
  | TricepsExerciseClassificationV1
  | ForearmsExerciseClassificationV1
  | QuadsExerciseClassificationV1
  | HamstringsExerciseClassificationV1
  | GlutesExerciseClassificationV1
  | CalvesExerciseClassificationV1
  | CoreExerciseClassificationV1;
