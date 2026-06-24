// lib/classifications/types.ts
/**
 * Oli Evidence-Based Classification Framework — core types.
 * Versioned, decoupled from engines. Non-diagnostic informational classifications only.
 */

export const CLASSIFICATION_LEVELS = [1, 2, 3, 4, 5] as const;

export type ClassificationLevel = (typeof CLASSIFICATION_LEVELS)[number];

export const CLASSIFICATION_LEVEL_NAMES: Record<ClassificationLevel, string> = {
  1: "High Risk",
  2: "Below Average",
  3: "Average",
  4: "Above Average",
  5: "Optimal",
};

export const CLASSIFICATION_DOMAINS = [
  "body-composition",
  "activity",
  "strength",
  "cardio",
  "recovery",
  "nutrition",
  "labs",
] as const;

export type ClassificationDomain = (typeof CLASSIFICATION_DOMAINS)[number];

/** Semantic version string for a classification definition set (e.g. "1.0"). */
export type ClassificationVersion = `${number}.${number}`;

export const CLASSIFICATION_FRAMEWORK_VERSION: ClassificationVersion = "1.0";

export type ClassificationSex = "male" | "female";

/**
 * Numeric band for one classification level.
 * Bounds are inclusive unless noted. `null` min/max means unbounded on that side.
 */
export type ClassificationLevelBand = {
  level: ClassificationLevel;
  label: string;
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export type ClassificationMetric = {
  metricId: string;
  displayName: string;
  domain: ClassificationDomain;
  version: ClassificationVersion;
  unit: string;
  /** ACSM, WHO, etc. — for professional review traceability. */
  evidenceSources: readonly string[];
  /** When set, metric applies only to this sex; omit for sex-neutral metrics. */
  sex?: ClassificationSex;
  levels: readonly ClassificationLevelBand[];
  notes?: string;
};

/** Alias — one metric definition in the registry. */
export type ClassificationDefinition = ClassificationMetric;

export type ClassificationResult =
  | {
      status: "unavailable";
      metricId: string;
      version: ClassificationVersion;
      domain?: ClassificationDomain;
      reason: "missing_value" | "unknown_metric" | "unsupported_sex";
    }
  | {
      status: "classified";
      metricId: string;
      version: ClassificationVersion;
      domain: ClassificationDomain;
      level: ClassificationLevel;
      levelLabel: string;
      value: number;
      displayName: string;
    };

export type DomainClassificationResult = {
  domain: ClassificationDomain;
  version: ClassificationVersion;
  metrics: readonly ClassificationResult[];
};
