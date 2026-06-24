// lib/classifications/cardio.ts
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

export const RESTING_HEART_RATE_METRIC: ClassificationMetric = {
  metricId: "resting-heart-rate",
  displayName: "Resting heart rate",
  domain: "cardio",
  version: V,
  unit: "bpm",
  evidenceSources: ["AHA", "ACSM"],
  levels: [
    band(1, 80, null, false, true),
    band(2, 70, 80, true, false),
    band(3, 60, 69),
    band(4, 50, 59),
    band(5, null, 50, true, false),
  ],
};

/**
 * VO₂ max classified by age/sex percentile (not fixed ml/kg/min thresholds).
 * Input value must be percentile 0–100.
 */
export const VO2_MAX_PERCENTILE_METRIC: ClassificationMetric = {
  metricId: "vo2-max-percentile",
  displayName: "VO₂ max (age/sex percentile)",
  domain: "cardio",
  version: V,
  unit: "percentile",
  evidenceSources: ["ACSM", "AHA", "Population reference tables"],
  levels: [
    band(1, null, 20, true, false),
    band(2, 20, 39, true, false),
    band(3, 40, 59, true, false),
    band(4, 60, 79, true, false),
    band(5, 80, null, false, true),
  ],
  notes: "Requires pre-computed age/sex percentile; raw VO₂ max alone is not classified here.",
};

export const CARDIO_METRICS: readonly ClassificationDefinition[] = [
  RESTING_HEART_RATE_METRIC,
  VO2_MAX_PERCENTILE_METRIC,
] as const;

export type CardioClassificationInput = {
  restingHeartRateBpm?: number | null;
  /** Age/sex normalized VO₂ percentile 0–100. */
  vo2MaxPercentile?: number | null;
};
