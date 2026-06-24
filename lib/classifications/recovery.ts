// lib/classifications/recovery.ts
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

export const SLEEP_DURATION_HOURS_METRIC: ClassificationMetric = {
  metricId: "sleep-duration-hours",
  displayName: "Sleep duration",
  domain: "recovery",
  version: V,
  unit: "hours/night",
  evidenceSources: ["Sleep Foundation", "WHO", "CDC"],
  levels: [
    band(1, null, 5, true, false),
    band(2, 5, 6, true, false),
    band(3, 6, 7, true, false),
    band(4, 7, 8, true, false),
    band(5, 8, 9),
  ],
  notes: "Values above 9 hours use conservative Level 1 fallback.",
};

/** Bedtime variance (standard deviation of bedtimes) in minutes over 14 days. */
export const SLEEP_CONSISTENCY_VARIANCE_METRIC: ClassificationMetric = {
  metricId: "sleep-bedtime-variance-minutes",
  displayName: "Sleep consistency (bedtime variance)",
  domain: "recovery",
  version: V,
  unit: "min SD",
  evidenceSources: ["Sleep Foundation"],
  levels: [
    band(1, 90, null, false, true),
    band(2, 60, 90, true, false),
    band(3, 30, 60, true, false),
    band(4, 15, 30, true, false),
    band(5, null, 15, true, false),
  ],
};

export const RECOVERY_METRICS: readonly ClassificationDefinition[] = [
  SLEEP_DURATION_HOURS_METRIC,
  SLEEP_CONSISTENCY_VARIANCE_METRIC,
] as const;

export type RecoveryClassificationInput = {
  sleepDurationHours?: number | null;
  bedtimeVarianceMinutes?: number | null;
};
