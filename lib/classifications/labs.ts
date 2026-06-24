// lib/classifications/labs.ts
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

export const HBA1C_PERCENT_METRIC: ClassificationMetric = {
  metricId: "hba1c-percent",
  displayName: "HbA1c",
  domain: "labs",
  version: V,
  unit: "%",
  evidenceSources: ["ADA", "CDC", "ACC"],
  levels: [
    band(1, 6.5, null, false, true),
    band(2, 5.7, 6.4),
    band(3, 5.4, 5.6),
    band(4, 5.0, 5.3),
    band(5, null, 5.0, true, false),
  ],
  notes: "Non-diagnostic classification for informational context only.",
};

/**
 * Classified from systolic BP (mmHg). Diastolic thresholds documented separately;
 * combined BP uses the worse of systolic/diastolic classifications in classifyLabs().
 */
export const SYSTOLIC_BP_METRIC: ClassificationMetric = {
  metricId: "systolic-bp",
  displayName: "Systolic blood pressure",
  domain: "labs",
  version: V,
  unit: "mmHg",
  evidenceSources: ["AHA", "ACC"],
  levels: [
    band(1, 140, null, false, true),
    band(2, 130, 139),
    band(3, 120, 129),
    band(4, null, 120, true, false),
    band(5, null, 115, true, false),
  ],
};

export const DIASTOLIC_BP_METRIC: ClassificationMetric = {
  metricId: "diastolic-bp",
  displayName: "Diastolic blood pressure",
  domain: "labs",
  version: V,
  unit: "mmHg",
  evidenceSources: ["AHA", "ACC"],
  levels: [
    band(1, 90, null, false, true),
    band(2, 80, 89),
    band(3, 75, 79),
    band(4, 70, 74),
    band(5, null, 70, true, false),
  ],
};

export const LABS_METRICS: readonly ClassificationDefinition[] = [
  HBA1C_PERCENT_METRIC,
  SYSTOLIC_BP_METRIC,
  DIASTOLIC_BP_METRIC,
] as const;

export type LabsClassificationInput = {
  hba1cPercent?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
};

/** Worse (lower level number = higher risk) of two classified levels. */
export function worseClassificationLevel(a: number, b: number): number {
  return Math.min(a, b);
}
