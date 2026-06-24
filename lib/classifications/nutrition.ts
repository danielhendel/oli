// lib/classifications/nutrition.ts
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

export const PROTEIN_G_PER_KG_METRIC: ClassificationMetric = {
  metricId: "protein-g-per-kg",
  displayName: "Protein intake",
  domain: "nutrition",
  version: V,
  unit: "g/kg/day",
  evidenceSources: ["ISSN", "ACSM"],
  levels: [
    band(1, null, 0.6, true, false),
    band(2, 0.6, 1.0, true, false),
    band(3, 1.0, 1.4, true, false),
    band(4, 1.4, 1.8, true, false),
    band(5, 1.8, 2.4),
  ],
  notes: "Values above 2.4 g/kg use conservative Level 1 fallback.",
};

export const FIBER_G_PER_DAY_METRIC: ClassificationMetric = {
  metricId: "fiber-g-per-day",
  displayName: "Fiber intake",
  domain: "nutrition",
  version: V,
  unit: "g/day",
  evidenceSources: ["WHO", "CDC"],
  levels: [
    band(1, null, 10, true, false),
    band(2, 10, 19, true, false),
    band(3, 20, 29, true, false),
    band(4, 30, 39, true, false),
    band(5, 40, null, false, true),
  ],
};

export const NUTRITION_METRICS: readonly ClassificationDefinition[] = [
  PROTEIN_G_PER_KG_METRIC,
  FIBER_G_PER_DAY_METRIC,
] as const;

export type NutritionClassificationInput = {
  proteinGPerKg?: number | null;
  fiberGPerDay?: number | null;
};
