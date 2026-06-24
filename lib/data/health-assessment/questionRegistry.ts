// lib/data/health-assessment/questionRegistry.ts
/**
 * Deterministic Health Assessment question registry grouped by category.
 * IDs are stable — do not rename without a migration plan.
 */
import type { AssessmentCategory, AssessmentQuestion } from "@/lib/data/health-assessment/types";
import { ASSESSMENT_CATEGORIES } from "@/lib/data/health-assessment/types";

const SEX_OPTIONS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "non-binary", label: "Non-binary" },
  { id: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

const ACTIVITY_LEVEL_OPTIONS = [
  { id: "sedentary", label: "Mostly sedentary", description: "Desk work, little daily movement" },
  { id: "light", label: "Lightly active", description: "Some walking, light daily activity" },
  { id: "moderate", label: "Moderately active", description: "On feet often, regular movement" },
  { id: "active", label: "Very active", description: "Physical job or high daily movement" },
] as const;

const GOAL_OPTIONS = [
  { id: "muscle-gain", label: "Build muscle" },
  { id: "fat-loss", label: "Lose fat" },
  { id: "body-composition", label: "Improve body composition" },
  { id: "performance", label: "Boost performance" },
  { id: "longevity", label: "Longevity & healthspan" },
  { id: "general-health", label: "General health" },
  { id: "rehabilitation", label: "Rehabilitation" },
] as const;

const FOCUS_OPTIONS = [
  { id: "body-composition", label: "Body composition" },
  { id: "performance", label: "Performance" },
  { id: "longevity", label: "Longevity" },
  { id: "general-health", label: "General health" },
  { id: "rehabilitation", label: "Rehabilitation" },
] as const;

const TIMEFRAME_OPTIONS = [
  { id: "4-weeks", label: "4 weeks" },
  { id: "8-weeks", label: "8 weeks" },
  { id: "12-weeks", label: "12 weeks" },
  { id: "6-months", label: "6 months" },
  { id: "12-months", label: "12+ months" },
  { id: "ongoing", label: "Ongoing / no fixed deadline" },
] as const;

const TRAINING_EXPERIENCE_OPTIONS = [
  { id: "beginner", label: "Beginner", description: "New or returning after a long break" },
  { id: "intermediate", label: "Intermediate", description: "1–3 years consistent training" },
  { id: "advanced", label: "Advanced", description: "3+ years structured training" },
  { id: "elite", label: "Elite / competitive", description: "Competitive or pro-level background" },
] as const;

const CARDIO_LEVEL_OPTIONS = [
  { id: "low", label: "Low", description: "Little structured cardio" },
  { id: "moderate", label: "Moderate", description: "1–3 cardio sessions per week" },
  { id: "high", label: "High", description: "4+ cardio sessions per week" },
] as const;

const EATING_PATTERN_OPTIONS = [
  { id: "standard", label: "Standard mixed diet" },
  { id: "high-protein", label: "High protein focus" },
  { id: "plant-forward", label: "Plant-forward" },
  { id: "low-carb", label: "Lower carb" },
  { id: "intermittent-fasting", label: "Intermittent fasting" },
  { id: "irregular", label: "Irregular / skip meals often" },
] as const;

const CONSISTENCY_OPTIONS = [
  { id: "rarely", label: "Rarely consistent" },
  { id: "sometimes", label: "Sometimes consistent" },
  { id: "usually", label: "Usually consistent" },
  { id: "very-consistent", label: "Very consistent" },
] as const;

const SLEEP_QUALITY_OPTIONS = [
  { id: "poor", label: "Poor" },
  { id: "fair", label: "Fair" },
  { id: "good", label: "Good" },
  { id: "excellent", label: "Excellent" },
] as const;

const STRESS_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "moderate", label: "Moderate" },
  { id: "high", label: "High" },
  { id: "very-high", label: "Very high" },
] as const;

const SORENESS_OPTIONS = [
  { id: "rarely", label: "Rarely sore or fatigued" },
  { id: "sometimes", label: "Sometimes sore between sessions" },
  { id: "often", label: "Often sore or fatigued" },
  { id: "chronic", label: "Chronic fatigue or soreness" },
] as const;

const YES_NO_UNSURE = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
] as const;

const YES_NO = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
] as const;

export const HEALTH_ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  // —— Identity ——
  {
    id: "identity-age",
    category: "identity",
    prompt: "How old are you?",
    helperText: "Used to personalize training and recovery guidance.",
    inputType: "number",
    required: true,
    min: 13,
    max: 100,
    unit: "years",
    placeholder: "e.g. 34",
  },
  {
    id: "identity-date-of-birth",
    category: "identity",
    prompt: "Date of birth (optional)",
    helperText: "Alternative to age if you prefer.",
    inputType: "date",
    placeholder: "YYYY-MM-DD",
  },
  {
    id: "identity-sex",
    category: "identity",
    prompt: "Sex assigned at birth or biological sex",
    inputType: "single-select",
    required: true,
    options: SEX_OPTIONS,
  },
  {
    id: "identity-height",
    category: "identity",
    prompt: "Height",
    inputType: "number",
    min: 48,
    max: 96,
    unit: "inches",
    placeholder: "e.g. 70",
  },
  {
    id: "identity-weight",
    category: "identity",
    prompt: "Current weight",
    inputType: "number",
    min: 50,
    max: 500,
    unit: "lbs",
    placeholder: "e.g. 175",
  },
  {
    id: "identity-occupation-activity",
    category: "identity",
    prompt: "Occupation / daily activity level",
    inputType: "single-select",
    required: true,
    options: ACTIVITY_LEVEL_OPTIONS,
  },
  {
    id: "identity-life-constraints",
    category: "identity",
    prompt: "Family or life constraints",
    helperText: "Travel, caregiving, shift work, or schedule limits that affect training.",
    inputType: "text",
    placeholder: "e.g. Two young kids, limited morning time",
  },

  // —— Goals ——
  {
    id: "goals-primary",
    category: "goals",
    prompt: "Primary goal",
    inputType: "single-select",
    required: true,
    options: GOAL_OPTIONS,
  },
  {
    id: "goals-secondary",
    category: "goals",
    prompt: "Secondary goals",
    helperText: "Select all that apply.",
    inputType: "multi-select",
    options: GOAL_OPTIONS,
  },
  {
    id: "goals-timeframe",
    category: "goals",
    prompt: "Target timeframe",
    inputType: "single-select",
    options: TIMEFRAME_OPTIONS,
  },
  {
    id: "goals-motivation",
    category: "goals",
    prompt: "What motivates you right now?",
    inputType: "text",
    placeholder: "e.g. Feel stronger, keep up with my kids",
  },
  {
    id: "goals-focus",
    category: "goals",
    prompt: "Preferred focus area",
    inputType: "single-select",
    options: FOCUS_OPTIONS,
  },

  // —— Health History ——
  {
    id: "history-conditions",
    category: "health-history",
    prompt: "Medical conditions",
    helperText: "List any you are comfortable sharing. Oli does not diagnose.",
    inputType: "text",
    placeholder: "e.g. Hypertension, asthma",
  },
  {
    id: "history-surgeries",
    category: "health-history",
    prompt: "Past surgeries",
    inputType: "text",
    placeholder: "e.g. ACL reconstruction 2019",
  },
  {
    id: "history-medications",
    category: "health-history",
    prompt: "Current medications",
    inputType: "text",
    placeholder: "e.g. Metformin, levothyroxine",
  },
  {
    id: "history-injuries",
    category: "health-history",
    prompt: "Current or recent injuries",
    inputType: "text",
    placeholder: "e.g. Shoulder impingement",
  },
  {
    id: "history-pain-areas",
    category: "health-history",
    prompt: "Pain areas",
    inputType: "text",
    placeholder: "e.g. Lower back, right knee",
  },
  {
    id: "history-family",
    category: "health-history",
    prompt: "Relevant family history",
    inputType: "text",
    placeholder: "e.g. Heart disease, type 2 diabetes",
  },
  {
    id: "history-doctor-restrictions",
    category: "health-history",
    prompt: "Doctor restrictions on exercise or diet?",
    inputType: "single-select",
    options: YES_NO_UNSURE,
  },

  // —— Fitness ——
  {
    id: "fitness-experience",
    category: "fitness",
    prompt: "Training experience",
    inputType: "single-select",
    required: true,
    options: TRAINING_EXPERIENCE_OPTIONS,
  },
  {
    id: "fitness-days-available",
    category: "fitness",
    prompt: "Training days available per week",
    inputType: "number",
    min: 1,
    max: 7,
    unit: "days",
    placeholder: "e.g. 4",
  },
  {
    id: "fitness-current-routine",
    category: "fitness",
    prompt: "Current workout routine",
    inputType: "text",
    placeholder: "e.g. Upper/lower split 4x/week",
  },
  {
    id: "fitness-strength-benchmarks",
    category: "fitness",
    prompt: "Strength benchmarks (if known)",
    inputType: "text",
    placeholder: "e.g. Squat 275, bench 185",
  },
  {
    id: "fitness-cardio-level",
    category: "fitness",
    prompt: "Cardio fitness level",
    inputType: "single-select",
    options: CARDIO_LEVEL_OPTIONS,
  },
  {
    id: "fitness-mobility-limitations",
    category: "fitness",
    prompt: "Mobility limitations",
    inputType: "text",
    placeholder: "e.g. Limited overhead range",
  },

  // —— Nutrition ——
  {
    id: "nutrition-eating-pattern",
    category: "nutrition",
    prompt: "Current eating pattern",
    inputType: "single-select",
    options: EATING_PATTERN_OPTIONS,
  },
  {
    id: "nutrition-food-preferences",
    category: "nutrition",
    prompt: "Food preferences",
    inputType: "text",
    placeholder: "e.g. Prefer chicken, rice, vegetables",
  },
  {
    id: "nutrition-restrictions",
    category: "nutrition",
    prompt: "Food restrictions or allergies",
    inputType: "text",
    placeholder: "e.g. Lactose intolerant, nut allergy",
  },
  {
    id: "nutrition-protein-consistency",
    category: "nutrition",
    prompt: "Protein intake consistency",
    inputType: "single-select",
    options: CONSISTENCY_OPTIONS,
  },
  {
    id: "nutrition-calorie-awareness",
    category: "nutrition",
    prompt: "Calorie / portion awareness",
    inputType: "single-select",
    options: CONSISTENCY_OPTIONS,
  },
  {
    id: "nutrition-alcohol",
    category: "nutrition",
    prompt: "Alcohol frequency",
    inputType: "single-select",
    options: [
      { id: "none", label: "None" },
      { id: "occasional", label: "Occasional (1–2 drinks/week)" },
      { id: "moderate", label: "Moderate (3–7 drinks/week)" },
      { id: "frequent", label: "Frequent (8+ drinks/week)" },
    ],
  },
  {
    id: "nutrition-meal-prep",
    category: "nutrition",
    prompt: "Meal prep ability",
    inputType: "single-select",
    options: [
      { id: "none", label: "Rarely cook or prep" },
      { id: "some", label: "Some prep on weekends" },
      { id: "regular", label: "Regular meal prep" },
      { id: "daily", label: "Cook most meals daily" },
    ],
  },

  // —— Recovery ——
  {
    id: "recovery-sleep-duration",
    category: "recovery",
    prompt: "Average sleep duration",
    inputType: "number",
    min: 3,
    max: 12,
    unit: "hours",
    placeholder: "e.g. 7",
  },
  {
    id: "recovery-sleep-quality",
    category: "recovery",
    prompt: "Sleep quality",
    inputType: "single-select",
    options: SLEEP_QUALITY_OPTIONS,
  },
  {
    id: "recovery-stress",
    category: "recovery",
    prompt: "Stress level",
    inputType: "single-select",
    options: STRESS_OPTIONS,
  },
  {
    id: "recovery-wearable",
    category: "recovery",
    prompt: "HRV / recovery wearable available?",
    inputType: "single-select",
    options: YES_NO,
  },
  {
    id: "recovery-soreness",
    category: "recovery",
    prompt: "Soreness / fatigue pattern",
    inputType: "single-select",
    options: SORENESS_OPTIONS,
  },

  // —— Biomarkers ——
  {
    id: "biomarkers-labs",
    category: "biomarkers",
    prompt: "Recent lab work available?",
    inputType: "single-select",
    options: YES_NO_UNSURE,
  },
  {
    id: "biomarkers-dexa",
    category: "biomarkers",
    prompt: "DEXA or body composition scan available?",
    inputType: "single-select",
    options: YES_NO_UNSURE,
  },
  {
    id: "biomarkers-dna",
    category: "biomarkers",
    prompt: "DNA / genetic test available?",
    inputType: "single-select",
    options: YES_NO_UNSURE,
  },
  {
    id: "biomarkers-blood-pressure",
    category: "biomarkers",
    prompt: "Recent blood pressure reading available?",
    inputType: "single-select",
    options: YES_NO_UNSURE,
  },
  {
    id: "biomarkers-testing-interest",
    category: "biomarkers",
    prompt: "Desired testing interest",
    inputType: "multi-select",
    options: [
      { id: "labs", label: "Blood labs" },
      { id: "dexa", label: "DEXA / body composition" },
      { id: "dna", label: "Genetic testing" },
      { id: "bp", label: "Blood pressure monitoring" },
      { id: "none", label: "Not interested right now" },
    ],
  },
] as const;

const questionsByCategory = new Map<AssessmentCategory, AssessmentQuestion[]>();
for (const category of ASSESSMENT_CATEGORIES) {
  questionsByCategory.set(
    category,
    HEALTH_ASSESSMENT_QUESTIONS.filter((q) => q.category === category),
  );
}

export function getQuestionsForCategory(category: AssessmentCategory): AssessmentQuestion[] {
  const questions = questionsByCategory.get(category);
  if (questions == null) {
    throw new Error(`Unknown assessment category: ${category}`);
  }
  return questions;
}

export function getQuestionById(questionId: string): AssessmentQuestion | undefined {
  return HEALTH_ASSESSMENT_QUESTIONS.find((q) => q.id === questionId);
}

export function getAllQuestionIds(): string[] {
  return HEALTH_ASSESSMENT_QUESTIONS.map((q) => q.id);
}

export function getAllOptionIds(question: AssessmentQuestion): string[] {
  return question.options?.map((o) => o.id) ?? [];
}

/** Validates registry integrity — every question belongs to a known category with a valid ID prefix. */
export function validateQuestionRegistry(): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const question of HEALTH_ASSESSMENT_QUESTIONS) {
    if (!ASSESSMENT_CATEGORIES.includes(question.category)) {
      errors.push(`Question ${question.id} has invalid category ${question.category}`);
    }
    if (seenIds.has(question.id)) {
      errors.push(`Duplicate question id: ${question.id}`);
    }
    seenIds.add(question.id);

    if (
      (question.inputType === "single-select" || question.inputType === "multi-select") &&
      (question.options == null || question.options.length === 0)
    ) {
      errors.push(`Question ${question.id} is missing options`);
    }
  }

  for (const category of ASSESSMENT_CATEGORIES) {
    const count = HEALTH_ASSESSMENT_QUESTIONS.filter((q) => q.category === category).length;
    if (count === 0) {
      errors.push(`Category ${category} has no questions`);
    }
  }

  return errors;
}
