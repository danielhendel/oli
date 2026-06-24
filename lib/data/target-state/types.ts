// lib/data/target-state/types.ts
/** Sprint C — Evidence-Based Target State domain types. */

import type { GoalType } from "@/lib/data/health-assessment/types";
import type { ClassificationDomain, ClassificationLevel, ClassificationVersion } from "@/lib/classifications/types";

export const TARGET_TIME_HORIZONS = [
  "oneWeek",
  "oneMonth",
  "threeMonths",
  "oneYear",
  "fiveYears",
  "tenYears",
] as const;

export type TargetTimeHorizon = (typeof TARGET_TIME_HORIZONS)[number];

/** 1 = highest priority within the roadmap. */
export type TargetPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TargetMetricDataStatus = "available" | "unavailable" | "maintain-optimal";

export type TargetMilestone = {
  horizon: TargetTimeHorizon;
  targetLevel: ClassificationLevel | null;
  classificationLabel: string;
  /** Target-state language only — not a health plan prescription. */
  description: string;
};

export type TargetStateMetric = {
  metricId: string;
  domain: ClassificationDomain;
  label: string;
  currentValue: number | null;
  currentLevel: ClassificationLevel | null;
  currentClassification: string | null;
  nextLevel: ClassificationLevel | null;
  nextClassification: string | null;
  nextLevelRange: string | null;
  optimalLevelRange: string | null;
  milestoneTargets: readonly TargetMilestone[];
  dataStatus: TargetMetricDataStatus;
  classificationVersion: ClassificationVersion;
  priority: TargetPriority;
};

export type TargetStateDomain = {
  domain: ClassificationDomain;
  title: string;
  priority: TargetPriority;
  metrics: readonly TargetStateMetric[];
};

export type TargetStateConfidence = "low" | "moderate" | "high";

export type TargetStateRoadmap = {
  generatedAt: string;
  classificationVersion: ClassificationVersion;
  primaryGoal: GoalType | null;
  domainPriorityOrder: readonly ClassificationDomain[];
  domains: readonly TargetStateDomain[];
  dataCoveragePercent: number;
  targetStateConfidence: TargetStateConfidence;
};

export type TargetStateSummary = {
  headline: string;
  primaryGoalAlignment: string | null;
  prioritizedDomainTitles: readonly string[];
  metricsWithMovementPotential: readonly string[];
  metricsAtOptimal: readonly string[];
  metricsNeedingData: readonly string[];
  targetStateConfidence: TargetStateConfidence;
  dataCoveragePercent: number;
  disclaimer: string;
};

export type TargetStateRoadmapInput = {
  baseline: import("@/lib/data/health-baseline/types").HealthBaseline | null;
  currentStateProfile: import("@/lib/data/health-assessment/types").CurrentStateProfile | null;
  sex?: "male" | "female" | null;
  generatedAt?: string;
};
