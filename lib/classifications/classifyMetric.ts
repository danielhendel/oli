// lib/classifications/classifyMetric.ts
import type {
  ClassificationDefinition,
  ClassificationLevelBand,
  ClassificationResult,
} from "@/lib/classifications/types";
import { CLASSIFICATION_LEVEL_NAMES } from "@/lib/classifications/types";

function valueInBand(value: number, band: ClassificationLevelBand): boolean {
  if (!Number.isFinite(value)) return false;

  if (band.min != null) {
    if (band.minInclusive) {
      if (value < band.min) return false;
    } else if (value <= band.min) {
      return false;
    }
  }

  if (band.max != null) {
    if (band.maxInclusive) {
      if (value > band.max) return false;
    } else if (value >= band.max) {
      return false;
    }
  }

  return true;
}

/**
 * Classify a single numeric value against a versioned metric definition.
 * Returns `unavailable` when value is null/undefined/non-finite.
 * When no band matches, returns level 1 (conservative) for out-of-range high-risk tail values.
 */
export function classifyMetric(
  definition: ClassificationDefinition,
  value: number | null | undefined,
): ClassificationResult {
  if (value == null || !Number.isFinite(value)) {
    return {
      status: "unavailable",
      metricId: definition.metricId,
      version: definition.version,
      domain: definition.domain,
      reason: "missing_value",
    };
  }

  const matched = definition.levels.find((band) => valueInBand(value, band));
  if (matched != null) {
    return {
      status: "classified",
      metricId: definition.metricId,
      version: definition.version,
      domain: definition.domain,
      level: matched.level,
      levelLabel: matched.label,
      value,
      displayName: definition.displayName,
    };
  }

  // Conservative fallback: values outside documented bands default to High Risk (Level 1).
  return {
    status: "classified",
    metricId: definition.metricId,
    version: definition.version,
    domain: definition.domain,
    level: 1,
    levelLabel: CLASSIFICATION_LEVEL_NAMES[1],
    value,
    displayName: definition.displayName,
  };
}

export function classifyMetricById(
  metricId: string,
  value: number | null | undefined,
  lookup: (id: string) => ClassificationDefinition | undefined,
): ClassificationResult {
  const definition = lookup(metricId);
  if (definition == null) {
    return {
      status: "unavailable",
      metricId,
      version: "1.0",
      reason: "unknown_metric",
    };
  }
  return classifyMetric(definition, value);
}
