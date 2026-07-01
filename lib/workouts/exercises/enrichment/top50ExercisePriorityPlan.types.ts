export type ExercisePriorityTier =
  | "tier-1-foundational"
  | "tier-2-high-frequency"
  | "tier-3-specialized";

export type ExercisePriorityUseCase =
  | "strength"
  | "hypertrophy"
  | "general-fitness"
  | "rehab-prehab"
  | "athletic-performance"
  | "conditioning"
  | "mobility"
  | "power"
  | "skill"
  | "warm-up";

export type ExerciseExpansionPriorityItem = {
  readonly exerciseId: string;
  readonly priorityRank: number;
  readonly tier: ExercisePriorityTier;
  readonly primaryUseCases: readonly ExercisePriorityUseCase[];
  readonly rationale: string;
  readonly mediaComplexity: "low" | "medium" | "high";
  readonly programmingFrequency: "low" | "medium" | "high";
  readonly keyframeComplexity: "low" | "medium" | "high";
  readonly notes: readonly string[];
};
