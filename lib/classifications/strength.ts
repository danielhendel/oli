// lib/classifications/strength.ts
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

/** Bench press as multiple of body weight (men). */
export const BENCH_PRESS_BW_MALE: ClassificationMetric = {
  metricId: "bench-press-bw-male",
  displayName: "Bench press (× body weight, men)",
  domain: "strength",
  version: V,
  unit: "× BW",
  sex: "male",
  evidenceSources: ["NSCA", "ACSM"],
  levels: [
    band(1, null, 0.75, true, false),
    band(2, 0.75, 1.0, true, false),
    band(3, 1.0, 1.25, true, false),
    band(4, 1.25, 1.5, true, false),
    band(5, 1.5, null, false, true),
  ],
};

export const SQUAT_BW_MALE: ClassificationMetric = {
  metricId: "squat-bw-male",
  displayName: "Squat (× body weight, men)",
  domain: "strength",
  version: V,
  unit: "× BW",
  sex: "male",
  evidenceSources: ["NSCA", "ACSM"],
  levels: [
    band(1, null, 1.0, true, false),
    band(2, 1.0, 1.5, true, false),
    band(3, 1.5, 2.0, true, false),
    band(4, 2.0, 2.5, true, false),
    band(5, 2.5, null, false, true),
  ],
};

/** Bench press as multiple of body weight (women). */
export const BENCH_PRESS_BW_FEMALE: ClassificationMetric = {
  metricId: "bench-press-bw-female",
  displayName: "Bench press (× body weight, women)",
  domain: "strength",
  version: V,
  unit: "× BW",
  sex: "female",
  evidenceSources: ["NSCA", "ACSM"],
  levels: [
    band(1, null, 0.5, true, false),
    band(2, 0.5, 0.65, true, false),
    band(3, 0.65, 0.85, true, false),
    band(4, 0.85, 1.0, true, false),
    band(5, 1.0, null, false, true),
  ],
};

export const SQUAT_BW_FEMALE: ClassificationMetric = {
  metricId: "squat-bw-female",
  displayName: "Squat (× body weight, women)",
  domain: "strength",
  version: V,
  unit: "× BW",
  sex: "female",
  evidenceSources: ["NSCA", "ACSM"],
  levels: [
    band(1, null, 0.75, true, false),
    band(2, 0.75, 1.0, true, false),
    band(3, 1.0, 1.25, true, false),
    band(4, 1.25, 1.5, true, false),
    band(5, 1.5, null, false, true),
  ],
};

export const STRENGTH_METRICS: readonly ClassificationDefinition[] = [
  BENCH_PRESS_BW_MALE,
  SQUAT_BW_MALE,
  BENCH_PRESS_BW_FEMALE,
  SQUAT_BW_FEMALE,
] as const;

export type StrengthClassificationInput = {
  sex?: "male" | "female" | null;
  benchPressKg?: number | null;
  squatKg?: number | null;
  bodyWeightKg?: number | null;
};
