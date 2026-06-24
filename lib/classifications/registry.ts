// lib/classifications/registry.ts
import { ACTIVITY_METRICS } from "@/lib/classifications/activity";
import { BODY_COMPOSITION_METRICS } from "@/lib/classifications/bodyComposition";
import { CARDIO_METRICS } from "@/lib/classifications/cardio";
import { LABS_METRICS } from "@/lib/classifications/labs";
import { NUTRITION_METRICS } from "@/lib/classifications/nutrition";
import { RECOVERY_METRICS } from "@/lib/classifications/recovery";
import { STRENGTH_METRICS } from "@/lib/classifications/strength";
import type {
  ClassificationDefinition,
  ClassificationDomain,
  ClassificationVersion,
} from "@/lib/classifications/types";
import { CLASSIFICATION_DOMAINS, CLASSIFICATION_FRAMEWORK_VERSION } from "@/lib/classifications/types";

const METRICS_BY_DOMAIN: Record<ClassificationDomain, readonly ClassificationDefinition[]> = {
  "body-composition": BODY_COMPOSITION_METRICS,
  activity: ACTIVITY_METRICS,
  strength: STRENGTH_METRICS,
  cardio: CARDIO_METRICS,
  recovery: RECOVERY_METRICS,
  nutrition: NUTRITION_METRICS,
  labs: LABS_METRICS,
};

export const CLASSIFICATION_REGISTRY: readonly ClassificationDefinition[] = [
  ...BODY_COMPOSITION_METRICS,
  ...ACTIVITY_METRICS,
  ...STRENGTH_METRICS,
  ...CARDIO_METRICS,
  ...RECOVERY_METRICS,
  ...NUTRITION_METRICS,
  ...LABS_METRICS,
] as const;

const METRIC_BY_ID = new Map<string, ClassificationDefinition>(
  CLASSIFICATION_REGISTRY.map((m) => [m.metricId, m]),
);

export function getClassificationMetric(metricId: string): ClassificationDefinition | undefined {
  return METRIC_BY_ID.get(metricId);
}

export function getMetricsForDomain(domain: ClassificationDomain): readonly ClassificationDefinition[] {
  return METRICS_BY_DOMAIN[domain];
}

export function getRegistryVersion(): ClassificationVersion {
  return CLASSIFICATION_FRAMEWORK_VERSION;
}

export function validateClassificationRegistry(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const metric of CLASSIFICATION_REGISTRY) {
    if (seen.has(metric.metricId)) {
      errors.push(`Duplicate metricId: ${metric.metricId}`);
    }
    seen.add(metric.metricId);

    if (!CLASSIFICATION_DOMAINS.includes(metric.domain)) {
      errors.push(`Invalid domain for ${metric.metricId}: ${metric.domain}`);
    }

    if (metric.version !== CLASSIFICATION_FRAMEWORK_VERSION) {
      errors.push(`Version mismatch for ${metric.metricId}: ${metric.version}`);
    }

    if (metric.levels.length !== 5) {
      errors.push(`Expected 5 levels for ${metric.metricId}, got ${metric.levels.length}`);
    }
  }

  for (const domain of CLASSIFICATION_DOMAINS) {
    const metrics = METRICS_BY_DOMAIN[domain];
    if (metrics.length === 0) {
      errors.push(`Domain ${domain} has no metrics`);
    }
  }

  return errors;
}

export function listMetricIdsByDomain(): Record<ClassificationDomain, string[]> {
  const out = {} as Record<ClassificationDomain, string[]>;
  for (const domain of CLASSIFICATION_DOMAINS) {
    out[domain] = METRICS_BY_DOMAIN[domain].map((m) => m.metricId);
  }
  return out;
}
