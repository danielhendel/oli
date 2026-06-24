// lib/data/health-baseline/types.ts
/** Sprint B — Health Baseline domain types (reality snapshot, no recommendations). */

import type { CurrentStateProfile } from "@/lib/data/health-assessment/types";

export const HEALTH_BASELINE_CATEGORIES = [
  "body-composition",
  "activity",
  "strength",
  "cardio",
  "nutrition",
  "recovery",
  "labs",
] as const;

export type HealthBaselineCategory = (typeof HEALTH_BASELINE_CATEGORIES)[number];

export type BaselineCategoryStatus = "ready" | "partial" | "missing";

export type BaselineConfidence = "low" | "moderate" | "high";

export type BaselineMetric = {
  key: string;
  label: string;
  value: string | null;
  available: boolean;
};

export type BodyCompositionBaseline = {
  status: BaselineCategoryStatus;
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  waistCm: number | null;
  bmi: number | null;
  weightClassification: string | null;
  metrics: readonly BaselineMetric[];
};

export type ActivityBaseline = {
  status: BaselineCategoryStatus;
  averageStepsPerDay: number | null;
  activeMinutesToday: number | null;
  weeklyMovementSummary: string | null;
  metrics: readonly BaselineMetric[];
};

export type StrengthBaseline = {
  status: BaselineCategoryStatus;
  estimatedOneRmKg: number | null;
  trainingFrequencyPerWeek: number | null;
  weeklyVolumeMinutes: number | null;
  consistencyLabel: string | null;
  metrics: readonly BaselineMetric[];
};

export type CardioBaseline = {
  status: BaselineCategoryStatus;
  restingHeartRateBpm: number | null;
  averageDurationMinutesPerWeek: number | null;
  averageDistanceMilesPerWeek: number | null;
  averagePaceMinPerKm: number | null;
  vo2Estimate: number | null;
  metrics: readonly BaselineMetric[];
};

export type NutritionBaseline = {
  status: BaselineCategoryStatus;
  averageCaloriesPerDay: number | null;
  averageProteinG: number | null;
  averageCarbsG: number | null;
  averageFatG: number | null;
  loggingConsistencyDaysPerWeek: number | null;
  metrics: readonly BaselineMetric[];
};

export type RecoveryBaseline = {
  status: BaselineCategoryStatus;
  sleepDurationMinutes: number | null;
  sleepConsistencyLabel: string | null;
  hrvRmssd: number | null;
  restingHeartRateBpm: number | null;
  metrics: readonly BaselineMetric[];
};

export type LabsBaseline = {
  status: BaselineCategoryStatus;
  latestLabsAvailable: boolean;
  labRecencyDays: number | null;
  biomarkerCount: number;
  availableBiomarkers: readonly string[];
  metrics: readonly BaselineMetric[];
};

export type HealthBaseline = {
  bodyComposition: BodyCompositionBaseline;
  activity: ActivityBaseline;
  strength: StrengthBaseline;
  cardio: CardioBaseline;
  nutrition: NutritionBaseline;
  recovery: RecoveryBaseline;
  labs: LabsBaseline;
  generatedAt: string;
  dataCompleteness: number;
  baselineConfidence: BaselineConfidence;
};

export type HealthBaselineSummary = {
  strengths: readonly string[];
  areasMissingData: readonly string[];
  mostReliableMetrics: readonly string[];
  mostIncompleteMetrics: readonly string[];
  baselineConfidence: BaselineConfidence;
  dataCompleteness: number;
};

export type HealthBaselineSummaryInput = {
  baseline: HealthBaseline;
  currentStateProfile: CurrentStateProfile | null;
};
