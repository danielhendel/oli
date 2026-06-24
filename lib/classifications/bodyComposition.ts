// lib/classifications/bodyComposition.ts
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

/** Men — body fat % (ACSM / population reference ranges). */
export const BODY_FAT_PERCENT_MALE: ClassificationMetric = {
  metricId: "body-fat-percent-male",
  displayName: "Body fat % (men)",
  domain: "body-composition",
  version: V,
  unit: "%",
  sex: "male",
  evidenceSources: ["ACSM", "NSCA", "Population reference ranges"],
  levels: [
    band(1, 30, null, false, true),
    band(2, 25, 30),
    band(3, 18, 24),
    band(4, 12, 17),
    band(5, 8, 12),
  ],
  notes: "Values below 8% fall outside documented optimal band; classifyMetric applies conservative Level 1 fallback.",
};

/** Women — body fat % (ACSM / population reference ranges). */
export const BODY_FAT_PERCENT_FEMALE: ClassificationMetric = {
  metricId: "body-fat-percent-female",
  displayName: "Body fat % (women)",
  domain: "body-composition",
  version: V,
  unit: "%",
  sex: "female",
  evidenceSources: ["ACSM", "NSCA", "Population reference ranges"],
  levels: [
    band(1, 40, null, false, true),
    band(2, 32, 40),
    band(3, 25, 31),
    band(4, 20, 24),
    band(5, 14, 19),
  ],
};

export const BMI_METRIC: ClassificationMetric = {
  metricId: "bmi",
  displayName: "BMI",
  domain: "body-composition",
  version: V,
  unit: "kg/m²",
  evidenceSources: ["WHO", "CDC"],
  levels: [
    band(1, 35, null, false, true),
    band(2, 30, 35, true, false),
    band(3, 25, 29.9),
    band(4, 22, 24.9),
    band(5, 20, 22),
  ],
  notes: "Underweight (<20) uses conservative Level 1 fallback.",
};

export const WAIST_TO_HEIGHT_RATIO_METRIC: ClassificationMetric = {
  metricId: "waist-to-height-ratio",
  displayName: "Waist-to-height ratio",
  domain: "body-composition",
  version: V,
  unit: "ratio",
  evidenceSources: ["WHO", "AHA", "ACC"],
  levels: [
    band(1, 0.65, null, false, true),
    band(2, 0.6, 0.65, true, false),
    band(3, 0.5, 0.59),
    band(4, 0.45, 0.49),
    band(5, null, 0.45, true, false),
  ],
};

export const BODY_COMPOSITION_METRICS: readonly ClassificationDefinition[] = [
  BODY_FAT_PERCENT_MALE,
  BODY_FAT_PERCENT_FEMALE,
  BMI_METRIC,
  WAIST_TO_HEIGHT_RATIO_METRIC,
] as const;

export type BodyCompositionClassificationInput = {
  sex?: "male" | "female" | null;
  bodyFatPercent?: number | null;
  bmi?: number | null;
  waistToHeightRatio?: number | null;
};
