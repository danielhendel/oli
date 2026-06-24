// lib/classifications/index.ts
export type {
  ClassificationDefinition,
  ClassificationDomain,
  ClassificationLevel,
  ClassificationLevelBand,
  ClassificationMetric,
  ClassificationResult,
  ClassificationSex,
  ClassificationVersion,
  DomainClassificationResult,
} from "@/lib/classifications/types";

export {
  CLASSIFICATION_DOMAINS,
  CLASSIFICATION_FRAMEWORK_VERSION,
  CLASSIFICATION_LEVEL_NAMES,
  CLASSIFICATION_LEVELS,
} from "@/lib/classifications/types";

export { classifyMetric, classifyMetricById } from "@/lib/classifications/classifyMetric";

export {
  classifyActivity,
  classifyBodyComposition,
  classifyCardio,
  classifyLabs,
  classifyNutrition,
  classifyRecovery,
  classifyStrength,
} from "@/lib/classifications/classifyDomains";

export {
  CLASSIFICATION_REGISTRY,
  getClassificationMetric,
  getMetricsForDomain,
  getRegistryVersion,
  listMetricIdsByDomain,
  validateClassificationRegistry,
} from "@/lib/classifications/registry";

export type { ActivityClassificationInput } from "@/lib/classifications/activity";
export type { BodyCompositionClassificationInput } from "@/lib/classifications/bodyComposition";
export type { CardioClassificationInput } from "@/lib/classifications/cardio";
export type { LabsClassificationInput } from "@/lib/classifications/labs";
export type { NutritionClassificationInput } from "@/lib/classifications/nutrition";
export type { RecoveryClassificationInput } from "@/lib/classifications/recovery";
export type { StrengthClassificationInput } from "@/lib/classifications/strength";
