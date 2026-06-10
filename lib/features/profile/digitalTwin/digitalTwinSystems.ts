// lib/features/profile/digitalTwin/digitalTwinSystems.ts
// Canonical Digital Twin system registry (13 top-level cards). Static descriptors + markers.

import type {
  DigitalTwinSystem,
  DigitalTwinSystemId,
  MetricDefinition,
} from "@/lib/features/profile/digitalTwin/types";
import { SYSTEM_METRICS } from "@/lib/features/profile/digitalTwin/digitalTwinMetricRegistry";

export const DIGITAL_TWIN_SYSTEMS: readonly DigitalTwinSystem[] = [
  {
    id: "general",
    title: "General",
    shortTitle: "General",
    description: "Profile and lifestyle basics.",
    needsDataCopy: "Profile and lifestyle basics.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS.general,
  },
  {
    id: "cardiovascular",
    title: "Cardiovascular Health",
    shortTitle: "Cardiovascular",
    description: "Heart, vessels, and aerobic risk.",
    needsDataCopy: "Heart, vessels, and aerobic risk.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS.cardiovascular,
  },
  {
    id: "metabolic",
    title: "Metabolic Health",
    shortTitle: "Metabolic",
    description: "Glucose, insulin, and liver health.",
    needsDataCopy: "Glucose, insulin, and liver health.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS.metabolic,
  },
  {
    id: "body-composition",
    title: "Body Composition",
    shortTitle: "Body",
    description: "Weight, muscle, fat, and bone.",
    needsDataCopy: "Weight, muscle, fat, and bone.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["body-composition"],
  },
  {
    id: "fitness",
    title: "Fitness Performance",
    shortTitle: "Fitness",
    description: "Strength, cardio, and training capacity.",
    needsDataCopy: "Strength, cardio, and training capacity.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS.fitness,
  },
  {
    id: "sleep-recovery",
    title: "Sleep Recovery",
    shortTitle: "Recovery",
    description: "Sleep quality and recovery signals.",
    needsDataCopy: "Sleep quality and recovery signals.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["sleep-recovery"],
  },
  {
    id: "hormones-thyroid",
    title: "Hormones + Thyroid",
    shortTitle: "Hormones",
    description: "Hormones and thyroid markers.",
    needsDataCopy: "Hormones and thyroid markers.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["hormones-thyroid"],
  },
  {
    id: "organ-function",
    title: "Organ Function",
    shortTitle: "Organs",
    description: "Kidney, liver, blood, and iron.",
    needsDataCopy: "Kidney, liver, blood, and iron.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["organ-function"],
  },
  {
    id: "nutritional-status",
    title: "Nutritional Status",
    shortTitle: "Nutrients",
    description: "Vitamins, minerals, and protein.",
    needsDataCopy: "Vitamins, minerals, and protein.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["nutritional-status"],
  },
  {
    id: "inflammation-immune",
    title: "Inflammation + Immune",
    shortTitle: "Immune",
    description: "Inflammation and immune markers.",
    needsDataCopy: "Inflammation and immune markers.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["inflammation-immune"],
  },
  {
    id: "cancer-prevention",
    title: "Cancer Prevention",
    shortTitle: "Prevention",
    description: "Screening and prevention data.",
    needsDataCopy: "Screening and prevention data.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["cancer-prevention"],
  },
  {
    id: "genetics",
    title: "Genetics + Precision",
    shortTitle: "Genetics",
    description: "DNA, risk, and medication response.",
    needsDataCopy: "DNA, risk, and medication response.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS.genetics,
  },
  {
    id: "brain-cognitive",
    title: "Brain + Cognitive",
    shortTitle: "Brain",
    description: "Cognition, mood, hearing, vision.",
    needsDataCopy: "Cognition, mood, hearing, vision.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["brain-cognitive"],
  },
  {
    id: "environment-gut-data",
    title: "Environment + Gut + Data",
    shortTitle: "Environment & Data",
    description: "Exposure, gut, and data quality.",
    needsDataCopy: "Exposure, gut, and data quality.",
    ctaRoute: null,
    ctaLabel: null,
    metrics: SYSTEM_METRICS["environment-gut-data"],
  },
] as const;

const SYSTEM_BY_ID: Record<string, DigitalTwinSystem> = Object.fromEntries(
  DIGITAL_TWIN_SYSTEMS.map((s) => [s.id, s]),
);

export function getDigitalTwinSystem(id: string): DigitalTwinSystem | null {
  return SYSTEM_BY_ID[id] ?? null;
}

export function isDigitalTwinSystemId(id: string): id is DigitalTwinSystemId {
  return id in SYSTEM_BY_ID;
}

/** First metric definition matching `metricId` across all systems, with its owning system. */
export function findDigitalTwinMetric(
  metricId: string,
): { metric: MetricDefinition; system: DigitalTwinSystem } | null {
  for (const system of DIGITAL_TWIN_SYSTEMS) {
    const metric = system.metrics.find((m) => m.id === metricId);
    if (metric) return { metric, system };
  }
  return null;
}

/** Systems that map to a server-computed HealthScore domain (status follows that domain). */
export const SYSTEM_TO_HEALTHSCORE_DOMAIN: Partial<
  Record<DigitalTwinSystemId, "recovery" | "training" | "nutrition" | "body">
> = {
  "sleep-recovery": "recovery",
  fitness: "training",
  metabolic: "nutrition",
  "body-composition": "body",
};

/** Systems that can carry server-computed status today (HealthScore domain-backed). */
export const REAL_DATA_SYSTEM_IDS: readonly DigitalTwinSystemId[] = [
  "cardiovascular",
  "metabolic",
  "body-composition",
  "fitness",
  "sleep-recovery",
];
