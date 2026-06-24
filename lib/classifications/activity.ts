// lib/classifications/activity.ts
import type { ClassificationDefinition, ClassificationMetric } from "@/lib/classifications/types";
import { CLASSIFICATION_FRAMEWORK_VERSION, CLASSIFICATION_LEVEL_NAMES } from "@/lib/classifications/types";

const V = CLASSIFICATION_FRAMEWORK_VERSION;

function band(
  level: 1 | 2 | 3 | 4 | 5,
  min: number | null,
  max: number | null,
  minInclusive = true,
  maxInclusive = true,
) {
  return {
    level,
    label: CLASSIFICATION_LEVEL_NAMES[level],
    min,
    max,
    minInclusive,
    maxInclusive,
  };
}

export const DAILY_STEPS_METRIC: ClassificationMetric = {
  metricId: "daily-steps",
  displayName: "Daily steps",
  domain: "activity",
  version: V,
  unit: "steps/day",
  evidenceSources: ["WHO", "CDC", "AHA"],
  levels: [
    band(1, null, 4000, true, false),
    band(2, 4000, 7000, true, false),
    band(3, 7000, 10000, true, false),
    band(4, 10000, 12000, true, false),
    band(5, 12000, null, false, true),
  ],
};

export const WEEKLY_ACTIVITY_MINUTES_METRIC: ClassificationMetric = {
  metricId: "weekly-activity-minutes",
  displayName: "Weekly activity minutes",
  domain: "activity",
  version: V,
  unit: "min/week",
  evidenceSources: ["WHO", "CDC", "ACSM"],
  levels: [
    band(1, null, 60, true, false),
    band(2, 60, 149, true, false),
    band(3, 150, 299, true, false),
    band(4, 300, 449, true, false),
    band(5, 450, null, false, true),
  ],
  notes: "Aligns with WHO moderate-intensity aerobic activity guidance (150+ min/week baseline).",
};

export const ACTIVITY_METRICS: readonly ClassificationDefinition[] = [
  DAILY_STEPS_METRIC,
  WEEKLY_ACTIVITY_MINUTES_METRIC,
] as const;

export type ActivityClassificationInput = {
  dailySteps?: number | null;
  weeklyActivityMinutes?: number | null;
};
