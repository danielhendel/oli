// lib/data/health-assessment/types.ts
/** Sprint A — Health Assessment domain types (client-first, no Firebase). */

export const ASSESSMENT_CATEGORIES = [
  "identity",
  "goals",
  "health-history",
  "fitness",
  "nutrition",
  "recovery",
  "biomarkers",
] as const;

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

export type QuestionInputType =
  | "single-select"
  | "multi-select"
  | "number"
  | "text"
  | "boolean"
  | "year"
  | "date";

export type GoalType =
  | "muscle-gain"
  | "fat-loss"
  | "performance"
  | "longevity"
  | "general-health"
  | "rehabilitation"
  | "body-composition";

export type TrainingExperienceLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type RecoveryCapacity = "low" | "moderate" | "high" | "unknown";

export type NutritionConsistency = "inconsistent" | "moderate" | "consistent" | "unknown";

export type HealthLimiter =
  | "injury"
  | "pain"
  | "medical-condition"
  | "doctor-restriction"
  | "mobility"
  | "recovery"
  | "nutrition"
  | "time"
  | "stress"
  | "sleep";

export type ReadinessToStart = "not-ready" | "cautious" | "ready" | "unknown";

export type AssessmentAnswerValue = string | string[] | number | boolean | null;

export type AssessmentQuestionOption = {
  id: string;
  label: string;
  description?: string;
};

export type AssessmentQuestion = {
  id: string;
  category: AssessmentCategory;
  prompt: string;
  helperText?: string;
  inputType: QuestionInputType;
  required?: boolean;
  options?: readonly AssessmentQuestionOption[];
  /** For number inputs */
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
};

export type AssessmentAnswer = {
  questionId: string;
  category: AssessmentCategory;
  value: AssessmentAnswerValue;
};

export type HealthAssessmentState = {
  answers: Record<string, AssessmentAnswer>;
  /** Index into ASSESSMENT_CATEGORIES for the active category step. */
  currentCategoryIndex: number;
  /** ISO timestamp when the user reached the summary step. */
  completedAt: string | null;
};

export type CurrentStateProfile = {
  primaryGoal: GoalType | null;
  readinessToStart: ReadinessToStart;
  trainingExperience: TrainingExperienceLevel;
  recoveryCapacity: RecoveryCapacity;
  nutritionConsistency: NutritionConsistency;
  /** Non-clinical caution flags for coaching context only. */
  riskFlags: string[];
  primaryLimiters: HealthLimiter[];
  recommendedStartingFocus: string;
  completedCategories: AssessmentCategory[];
  completionPercent: number;
};
