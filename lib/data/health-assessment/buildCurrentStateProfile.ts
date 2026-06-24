// lib/data/health-assessment/buildCurrentStateProfile.ts
/**
 * Pure, deterministic Current State Profile builder.
 * Conservative, non-medical, no diagnosis — prepares Sprint B Baseline inputs.
 */
import type {
  AssessmentCategory,
  CurrentStateProfile,
  GoalType,
  HealthAssessmentState,
  HealthLimiter,
  NutritionConsistency,
  ReadinessToStart,
  RecoveryCapacity,
  TrainingExperienceLevel,
} from "@/lib/data/health-assessment/types";
import { ASSESSMENT_CATEGORIES } from "@/lib/data/health-assessment/types";
import {
  getQuestionsForCategory,
  HEALTH_ASSESSMENT_QUESTIONS,
} from "@/lib/data/health-assessment/questionRegistry";

function answerString(state: HealthAssessmentState, questionId: string): string | null {
  const answer = state.answers[questionId];
  if (answer == null || answer.value == null) return null;
  if (typeof answer.value === "string") return answer.value.trim().length > 0 ? answer.value : null;
  return null;
}

function answerNumber(state: HealthAssessmentState, questionId: string): number | null {
  const answer = state.answers[questionId];
  if (answer == null || answer.value == null) return null;
  if (typeof answer.value === "number" && Number.isFinite(answer.value)) return answer.value;
  return null;
}

function answerMulti(state: HealthAssessmentState, questionId: string): string[] {
  const answer = state.answers[questionId];
  if (answer == null || !Array.isArray(answer.value)) return [];
  return answer.value.filter((v): v is string => typeof v === "string");
}

function hasTextAnswer(state: HealthAssessmentState, questionId: string): boolean {
  return answerString(state, questionId) != null;
}

function isGoalType(value: string | null): value is GoalType {
  if (value == null) return false;
  const goals: GoalType[] = [
    "muscle-gain",
    "fat-loss",
    "performance",
    "longevity",
    "general-health",
    "rehabilitation",
    "body-composition",
  ];
  return goals.includes(value as GoalType);
}

function isTrainingLevel(value: string | null): value is TrainingExperienceLevel {
  if (value == null) return false;
  const levels: TrainingExperienceLevel[] = ["beginner", "intermediate", "advanced", "elite"];
  return levels.includes(value as TrainingExperienceLevel);
}

function categoryCompletionPercent(
  state: HealthAssessmentState,
  category: AssessmentCategory,
): number {
  const questions = getQuestionsForCategory(category);
  if (questions.length === 0) return 0;
  const answered = questions.filter((q) => {
    const a = state.answers[q.id];
    if (a == null || a.value == null) return false;
    if (typeof a.value === "string") return a.value.trim().length > 0;
    if (Array.isArray(a.value)) return a.value.length > 0;
    if (typeof a.value === "number") return Number.isFinite(a.value);
    if (typeof a.value === "boolean") return true;
    return false;
  }).length;
  return answered / questions.length;
}

function inferRecoveryCapacity(state: HealthAssessmentState): RecoveryCapacity {
  const sleepHours = answerNumber(state, "recovery-sleep-duration");
  const sleepQuality = answerString(state, "recovery-sleep-quality");
  const stress = answerString(state, "recovery-stress");
  const soreness = answerString(state, "recovery-soreness");

  let score = 0;
  let signals = 0;

  if (sleepHours != null) {
    signals += 1;
    if (sleepHours >= 7 && sleepHours <= 9) score += 2;
    else if (sleepHours >= 6) score += 1;
  }
  if (sleepQuality != null) {
    signals += 1;
    if (sleepQuality === "excellent" || sleepQuality === "good") score += 2;
    else if (sleepQuality === "fair") score += 1;
  }
  if (stress != null) {
    signals += 1;
    if (stress === "low") score += 2;
    else if (stress === "moderate") score += 1;
  }
  if (soreness != null) {
    signals += 1;
    if (soreness === "rarely") score += 2;
    else if (soreness === "sometimes") score += 1;
  }

  if (signals === 0) return "unknown";
  const avg = score / signals;
  if (avg >= 1.75) return "high";
  if (avg >= 1) return "moderate";
  return "low";
}

function inferNutritionConsistency(state: HealthAssessmentState): NutritionConsistency {
  const protein = answerString(state, "nutrition-protein-consistency");
  const calories = answerString(state, "nutrition-calorie-awareness");
  const pattern = answerString(state, "nutrition-eating-pattern");

  let score = 0;
  let signals = 0;

  const consistencyScore = (value: string | null): number => {
    if (value == null) return -1;
    if (value === "very-consistent") return 2;
    if (value === "usually") return 1.5;
    if (value === "sometimes") return 1;
    if (value === "rarely") return 0;
    return -1;
  };

  const p = consistencyScore(protein);
  if (p >= 0) {
    signals += 1;
    score += p;
  }
  const c = consistencyScore(calories);
  if (c >= 0) {
    signals += 1;
    score += c;
  }
  if (pattern != null) {
    signals += 1;
    if (pattern === "irregular") score += 0;
    else score += 1;
  }

  if (signals === 0) return "unknown";
  const avg = score / signals;
  if (avg >= 1.5) return "consistent";
  if (avg >= 0.75) return "moderate";
  return "inconsistent";
}

function inferLimiters(state: HealthAssessmentState): HealthLimiter[] {
  const limiters: HealthLimiter[] = [];

  if (hasTextAnswer(state, "history-injuries")) limiters.push("injury");
  if (hasTextAnswer(state, "history-pain-areas")) limiters.push("pain");
  if (hasTextAnswer(state, "history-conditions")) limiters.push("medical-condition");
  if (answerString(state, "history-doctor-restrictions") === "yes") {
    limiters.push("doctor-restriction");
  }
  if (hasTextAnswer(state, "fitness-mobility-limitations")) limiters.push("mobility");

  const recovery = inferRecoveryCapacity(state);
  if (recovery === "low") limiters.push("recovery");

  const nutrition = inferNutritionConsistency(state);
  if (nutrition === "inconsistent") limiters.push("nutrition");

  const stress = answerString(state, "recovery-stress");
  if (stress === "high" || stress === "very-high") limiters.push("stress");

  const sleepHours = answerNumber(state, "recovery-sleep-duration");
  const sleepQuality = answerString(state, "recovery-sleep-quality");
  if (
    (sleepHours != null && sleepHours < 6) ||
    sleepQuality === "poor"
  ) {
    limiters.push("sleep");
  }

  const days = answerNumber(state, "fitness-days-available");
  if (days != null && days <= 2) limiters.push("time");

  if (hasTextAnswer(state, "identity-life-constraints")) limiters.push("time");

  return [...new Set(limiters)];
}

function inferRiskFlags(state: HealthAssessmentState): string[] {
  const flags: string[] = [];

  if (answerString(state, "history-doctor-restrictions") === "yes") {
    flags.push("Doctor restrictions reported — proceed cautiously");
  }
  if (hasTextAnswer(state, "history-injuries")) {
    flags.push("Active or recent injury reported");
  }
  if (hasTextAnswer(state, "history-pain-areas")) {
    flags.push("Pain areas reported");
  }
  if (hasTextAnswer(state, "history-conditions")) {
    flags.push("Medical conditions noted — not a diagnosis");
  }

  const sleepHours = answerNumber(state, "recovery-sleep-duration");
  if (sleepHours != null && sleepHours < 6) {
    flags.push("Short sleep duration reported");
  }

  const stress = answerString(state, "recovery-stress");
  if (stress === "very-high" || stress === "high") {
    flags.push("Elevated stress reported");
  }

  const soreness = answerString(state, "recovery-soreness");
  if (soreness === "chronic" || soreness === "often") {
    flags.push("Frequent fatigue or soreness reported");
  }

  return flags;
}

function inferReadiness(
  state: HealthAssessmentState,
  limiters: HealthLimiter[],
  riskFlags: string[],
): ReadinessToStart {
  if (answerString(state, "history-doctor-restrictions") === "yes") {
    return "not-ready";
  }
  if (limiters.includes("injury") && limiters.includes("pain")) {
    return "cautious";
  }
  if (riskFlags.length >= 3) {
    return "cautious";
  }
  if (limiters.includes("recovery") && limiters.includes("sleep")) {
    return "cautious";
  }

  const primaryGoal = answerString(state, "goals-primary");
  const experience = answerString(state, "fitness-experience");
  if (primaryGoal != null && experience != null) {
    return "ready";
  }

  const answeredCount = Object.keys(state.answers).length;
  if (answeredCount < 5) return "unknown";

  return riskFlags.length > 0 ? "cautious" : "ready";
}

function inferRecommendedFocus(
  primaryGoal: GoalType | null,
  limiters: HealthLimiter[],
  recovery: RecoveryCapacity,
): string {
  if (limiters.includes("doctor-restriction")) {
    return "Follow clinician guidance before increasing training load";
  }
  if (limiters.includes("recovery") || limiters.includes("sleep") || recovery === "low") {
    return "Recovery foundations — sleep, stress, and sustainable training frequency";
  }
  if (limiters.includes("injury") || limiters.includes("mobility")) {
    return "Movement quality and injury-aware progression";
  }
  if (limiters.includes("nutrition")) {
    return "Nutrition consistency and protein habits";
  }

  switch (primaryGoal) {
    case "muscle-gain":
    case "body-composition":
      return "Progressive resistance training with protein-forward nutrition";
    case "fat-loss":
      return "Sustainable calorie awareness with strength maintenance";
    case "performance":
      return "Structured training blocks with recovery monitoring";
    case "longevity":
      return "Balanced strength, cardio, and recovery habits";
    case "rehabilitation":
      return "Gradual return-to-activity with mobility emphasis";
    case "general-health":
    default:
      return "Foundational movement, nutrition, and recovery habits";
  }
}

export function buildCurrentStateProfile(state: HealthAssessmentState): CurrentStateProfile {
  const completedCategories = ASSESSMENT_CATEGORIES.filter(
    (category) => categoryCompletionPercent(state, category) >= 0.5,
  );

  const totalQuestions = HEALTH_ASSESSMENT_QUESTIONS.length;
  const answeredQuestions = HEALTH_ASSESSMENT_QUESTIONS.filter((q) => {
    const a = state.answers[q.id];
    if (a == null || a.value == null) return false;
    if (typeof a.value === "string") return a.value.trim().length > 0;
    if (Array.isArray(a.value)) return a.value.length > 0;
    if (typeof a.value === "number") return Number.isFinite(a.value);
    if (typeof a.value === "boolean") return true;
    return false;
  }).length;

  const completionPercent =
    totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const primaryGoalRaw = answerString(state, "goals-primary");
  const primaryGoal = isGoalType(primaryGoalRaw) ? primaryGoalRaw : null;

  const experienceRaw = answerString(state, "fitness-experience");
  const trainingExperience: TrainingExperienceLevel = isTrainingLevel(experienceRaw)
    ? experienceRaw
    : "beginner";

  const recoveryCapacity = inferRecoveryCapacity(state);
  const nutritionConsistency = inferNutritionConsistency(state);
  const primaryLimiters = inferLimiters(state);
  const riskFlags = inferRiskFlags(state);
  const readinessToStart = inferReadiness(state, primaryLimiters, riskFlags);
  const recommendedStartingFocus = inferRecommendedFocus(
    primaryGoal,
    primaryLimiters,
    recoveryCapacity,
  );

  // Secondary goals can reinforce focus when primary is missing
  const secondary = answerMulti(state, "goals-secondary");
  const resolvedGoal =
    primaryGoal ??
    (secondary.find((g) => isGoalType(g)) as GoalType | undefined) ??
    null;

  return {
    primaryGoal: resolvedGoal,
    readinessToStart,
    trainingExperience,
    recoveryCapacity,
    nutritionConsistency,
    riskFlags,
    primaryLimiters,
    recommendedStartingFocus,
    completedCategories,
    completionPercent,
  };
}

/** Whether the user has started the assessment (any answer recorded). */
export function hasAssessmentProgress(state: HealthAssessmentState): boolean {
  return Object.keys(state.answers).length > 0;
}

/** Fraction of questions answered in a category (0–1). */
export function categoryProgress(
  state: HealthAssessmentState,
  category: AssessmentCategory,
): number {
  return categoryCompletionPercent(state, category);
}
