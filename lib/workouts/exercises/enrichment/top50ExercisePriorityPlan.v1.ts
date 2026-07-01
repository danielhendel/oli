import type {
  ExerciseExpansionPriorityItem,
  ExercisePriorityTier,
  ExercisePriorityUseCase,
} from "./top50ExercisePriorityPlan.types";

type PrioritySeed = {
  readonly exerciseId: string;
  readonly priorityRank: number;
  readonly tier: ExercisePriorityTier;
  readonly primaryUseCases: readonly ExercisePriorityUseCase[];
  readonly rationale: string;
  readonly mediaComplexity: ExerciseExpansionPriorityItem["mediaComplexity"];
  readonly programmingFrequency: ExerciseExpansionPriorityItem["programmingFrequency"];
  readonly keyframeComplexity: ExerciseExpansionPriorityItem["keyframeComplexity"];
  readonly notes: readonly string[];
};

function item(seed: PrioritySeed): ExerciseExpansionPriorityItem {
  return seed;
}

/**
 * Top 50 Exercise Priority Plan v1.
 * Selection: all 20 Academy Intelligence exercises + 30 foundational high-frequency movements.
 * All exerciseIds validated against EXERCISE_LIBRARY_V1 at test time.
 */
export const TOP50_EXERCISE_PRIORITY_PLAN_V1: readonly ExerciseExpansionPriorityItem[] = [
  // Tier 1 — foundational (ranks 1–15)
  item({ exerciseId: "bench_press", priorityRank: 1, tier: "tier-1-foundational", primaryUseCases: ["strength", "hypertrophy", "general-fitness"], rationale: "Primary horizontal press; M9–M11 media pipeline pilot.", mediaComplexity: "high", programmingFrequency: "high", keyframeComplexity: "high", notes: ["M9 keyframe spec exists", "M11 image pack pilot"] }),
  item({ exerciseId: "squat", priorityRank: 2, tier: "tier-1-foundational", primaryUseCases: ["strength", "hypertrophy", "athletic-performance"], rationale: "Primary bilateral squat pattern.", mediaComplexity: "high", programmingFrequency: "high", keyframeComplexity: "high", notes: ["Full body visibility required"] }),
  item({ exerciseId: "deadlift", priorityRank: 3, tier: "tier-1-foundational", primaryUseCases: ["strength", "hypertrophy", "athletic-performance"], rationale: "Primary conventional hinge.", mediaComplexity: "high", programmingFrequency: "high", keyframeComplexity: "high", notes: ["Bar path and spine neutrality critical"] }),
  item({ exerciseId: "overhead_press", priorityRank: 4, tier: "tier-1-foundational", primaryUseCases: ["strength", "hypertrophy"], rationale: "Primary vertical press.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: ["Overhead position QA focus"] }),
  item({ exerciseId: "barbell_row", priorityRank: 5, tier: "tier-1-foundational", primaryUseCases: ["strength", "hypertrophy"], rationale: "Primary horizontal pull.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "pull_up", priorityRank: 6, tier: "tier-1-foundational", primaryUseCases: ["strength", "hypertrophy", "general-fitness"], rationale: "Primary vertical pull bodyweight.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: ["Full hang to chin-over-bar ROM"] }),
  item({ exerciseId: "romanian_deadlift", priorityRank: 7, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength", "rehab-prehab"], rationale: "Primary hip hinge accessory.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "hip_thrust", priorityRank: 8, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength", "athletic-performance"], rationale: "Primary glute-dominant hinge.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "incline_bench_press", priorityRank: 9, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength"], rationale: "Incline horizontal press variation.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "lat_pulldown", priorityRank: 10, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "general-fitness"], rationale: "Accessible vertical pull.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "leg_press", priorityRank: 11, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength", "rehab-prehab"], rationale: "Machine squat pattern.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "dumbbell_bench_press", priorityRank: 12, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength"], rationale: "Unilateral-stability horizontal press.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "seated_cable_row", priorityRank: 13, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "general-fitness"], rationale: "Stable horizontal pull.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "front_squat", priorityRank: 14, tier: "tier-1-foundational", primaryUseCases: ["strength", "athletic-performance"], rationale: "Upright squat variation.", mediaComplexity: "high", programmingFrequency: "medium", keyframeComplexity: "high", notes: ["Elbow and wrist position QA"] }),
  item({ exerciseId: "push_up", priorityRank: 15, tier: "tier-1-foundational", primaryUseCases: ["general-fitness", "hypertrophy", "conditioning"], rationale: "Bodyweight horizontal press.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),

  // Tier 1–2 — ranks 16–25 (Top 25 enrichment scope)
  item({ exerciseId: "dumbbell_shoulder_press", priorityRank: 16, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength"], rationale: "Dumbbell vertical press.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "dumbbell_row", priorityRank: 17, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength"], rationale: "Unilateral horizontal pull.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "split_squat_dumbbell", priorityRank: 18, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength", "rehab-prehab"], rationale: "Primary split squat pattern.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: ["Academy uses split_squat_dumbbell (not split_squat)"] }),
  item({ exerciseId: "bulgarian_split_squat_dumbbell", priorityRank: 19, tier: "tier-1-foundational", primaryUseCases: ["hypertrophy", "strength"], rationale: "Rear-foot elevated split squat.", mediaComplexity: "medium", programmingFrequency: "high", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "leg_curl", priorityRank: 20, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "rehab-prehab"], rationale: "Knee flexion isolation.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "leg_extension", priorityRank: 21, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "rehab-prehab"], rationale: "Knee extension isolation.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "calf_raise", priorityRank: 22, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "general-fitness"], rationale: "Ankle plantarflexion.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "face_pull", priorityRank: 23, tier: "tier-2-high-frequency", primaryUseCases: ["rehab-prehab", "hypertrophy"], rationale: "Posterior shoulder and scapular control.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "lateral_raise", priorityRank: 24, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy"], rationale: "Medial delt isolation.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "rear_delt_fly", priorityRank: 25, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "rehab-prehab"], rationale: "Posterior delt isolation.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),

  // Tier 2 — ranks 26–40
  item({ exerciseId: "hack_squat", priorityRank: 26, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "strength"], rationale: "Machine squat emphasis.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: ["Academy intelligence exists"] }),
  item({ exerciseId: "tricep_pushdown", priorityRank: 27, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy"], rationale: "Triceps isolation.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "bicep_curl", priorityRank: 28, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy"], rationale: "Biceps isolation.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "dip", priorityRank: 29, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "strength"], rationale: "Compound push bodyweight.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "skull_crusher", priorityRank: 30, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy"], rationale: "Triceps extension.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "plank", priorityRank: 31, tier: "tier-2-high-frequency", primaryUseCases: ["rehab-prehab", "general-fitness"], rationale: "Anti-extension core.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "pallof_press", priorityRank: 32, tier: "tier-2-high-frequency", primaryUseCases: ["rehab-prehab", "strength"], rationale: "Anti-rotation core.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "barbell_lunge", priorityRank: 33, tier: "tier-2-high-frequency", primaryUseCases: ["strength", "hypertrophy"], rationale: "Bilateral-loaded lunge.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "bodyweight_glute_bridge", priorityRank: 34, tier: "tier-2-high-frequency", primaryUseCases: ["rehab-prehab", "hypertrophy"], rationale: "Glute bridge regression.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: ["Canonical id is bodyweight_glute_bridge"] }),
  item({ exerciseId: "dumbbell_farmer_carry", priorityRank: 35, tier: "tier-2-high-frequency", primaryUseCases: ["strength", "conditioning", "general-fitness"], rationale: "Loaded carry pattern.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "hanging_leg_raise", priorityRank: 36, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "skill"], rationale: "Hip flexion core.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "dead_bug", priorityRank: 37, tier: "tier-2-high-frequency", primaryUseCases: ["rehab-prehab", "warm-up"], rationale: "Anti-extension core control.", mediaComplexity: "low", programmingFrequency: "high", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "push_press", priorityRank: 38, tier: "tier-2-high-frequency", primaryUseCases: ["power", "strength"], rationale: "Power vertical press.", mediaComplexity: "high", programmingFrequency: "medium", keyframeComplexity: "high", notes: [] }),
  item({ exerciseId: "sumo_deadlift", priorityRank: 39, tier: "tier-2-high-frequency", primaryUseCases: ["strength", "hypertrophy"], rationale: "Wide-stance hinge.", mediaComplexity: "high", programmingFrequency: "medium", keyframeComplexity: "high", notes: [] }),
  item({ exerciseId: "close_grip_bench_press", priorityRank: 40, tier: "tier-2-high-frequency", primaryUseCases: ["hypertrophy", "strength"], rationale: "Triceps-emphasis press.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),

  // Tier 3 — ranks 41–50
  item({ exerciseId: "hammer_curl", priorityRank: 41, tier: "tier-3-specialized", primaryUseCases: ["hypertrophy"], rationale: "Brachialis and biceps variation.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "pendlay_row", priorityRank: 42, tier: "tier-3-specialized", primaryUseCases: ["strength", "power"], rationale: "Explosive horizontal pull from floor.", mediaComplexity: "medium", programmingFrequency: "low", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "good_morning", priorityRank: 43, tier: "tier-3-specialized", primaryUseCases: ["strength", "rehab-prehab"], rationale: "Hip hinge accessory.", mediaComplexity: "medium", programmingFrequency: "low", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "dumbbell_step_up", priorityRank: 44, tier: "tier-3-specialized", primaryUseCases: ["strength", "hypertrophy"], rationale: "Unilateral step pattern.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "reverse_lunge_barbell", priorityRank: 45, tier: "tier-3-specialized", primaryUseCases: ["strength", "hypertrophy"], rationale: "Reverse lunge pattern.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "dumbbell_incline_bench_press", priorityRank: 46, tier: "tier-3-specialized", primaryUseCases: ["hypertrophy"], rationale: "Incline dumbbell press.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
  item({ exerciseId: "band_monster_walk", priorityRank: 47, tier: "tier-3-specialized", primaryUseCases: ["mobility", "rehab-prehab", "warm-up"], rationale: "Hip abduction warm-up.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "band_anti_rotation_hold", priorityRank: 48, tier: "tier-3-specialized", primaryUseCases: ["rehab-prehab", "warm-up"], rationale: "Anti-rotation isometric.", mediaComplexity: "low", programmingFrequency: "medium", keyframeComplexity: "low", notes: [] }),
  item({ exerciseId: "burpee", priorityRank: 49, tier: "tier-3-specialized", primaryUseCases: ["conditioning"], rationale: "Full-body conditioning.", mediaComplexity: "high", programmingFrequency: "medium", keyframeComplexity: "high", notes: [] }),
  item({ exerciseId: "rower", priorityRank: 50, tier: "tier-3-specialized", primaryUseCases: ["conditioning"], rationale: "Cardio conditioning machine.", mediaComplexity: "medium", programmingFrequency: "medium", keyframeComplexity: "medium", notes: [] }),
];

export const TOP50_EXERCISE_PRIORITY_PLAN_VERSION = "top50-exercise-priority-plan-v1" as const;

export const TOP25_EXERCISE_PRIORITY_IDS: readonly string[] = TOP50_EXERCISE_PRIORITY_PLAN_V1.filter(
  (item) => item.priorityRank <= 25,
).map((item) => item.exerciseId);

export const TOP50_EXERCISE_PRIORITY_IDS: readonly string[] = TOP50_EXERCISE_PRIORITY_PLAN_V1.map(
  (item) => item.exerciseId,
);
