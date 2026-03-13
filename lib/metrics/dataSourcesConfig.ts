/**
 * Data Sources — Slice 1 config.
 * Known sources, metric IDs/labels, and which sources can provide which metrics.
 * Aligns with Manage health category language where applicable.
 */

export const SLICE_1_SOURCE_IDS = [
  "withings",
  "apple_health",
  "oura",
  "manual",
  "upload",
  "labs",
] as const;

export type Slice1SourceId = (typeof SLICE_1_SOURCE_IDS)[number];

export const SOURCE_DISPLAY_NAMES: Record<Slice1SourceId, string> = {
  withings: "Withings",
  apple_health: "Apple Health",
  oura: "Oura",
  manual: "Manual Entry",
  upload: "Uploads",
  labs: "Labs",
};

/** Slice 1 assignable metrics: id and label (Manage language). */
export const SLICE_1_METRICS = [
  { id: "weight", label: "Weight", group: "BODY & STRUCTURAL" as const },
  { id: "body_fat_percent", label: "Body fat", group: "BODY & STRUCTURAL" as const },
  { id: "hrv", label: "HRV", group: "CARDIOVASCULAR" as const },
  { id: "steps", label: "Steps", group: "CARDIOVASCULAR" as const },
  { id: "activity_minutes", label: "Activity minutes", group: "CARDIOVASCULAR" as const },
  { id: "sleep_duration", label: "Sleep duration", group: "SLEEP & CIRCADIAN" as const },
  { id: "lab_results", label: "Lab results", group: "LABS & RECORDS" as const },
  { id: "uploads", label: "Uploads", group: "LABS & RECORDS" as const },
] as const;

export type Slice1MetricId = (typeof SLICE_1_METRICS)[number]["id"];

/** For each metric, which source IDs are valid options in the picker. */
export const METRIC_ALLOWED_SOURCES: Record<Slice1MetricId, readonly Slice1SourceId[]> = {
  weight: ["withings", "manual"],
  body_fat_percent: ["withings", "manual"],
  steps: ["apple_health", "manual"],
  activity_minutes: ["apple_health", "manual"],
  hrv: ["apple_health", "oura", "manual"],
  sleep_duration: ["apple_health", "oura", "manual"],
  lab_results: ["labs", "upload"],
  uploads: ["upload"],
};

export function getSourceDisplayName(sourceId: string): string {
  if (SOURCE_DISPLAY_NAMES[sourceId as Slice1SourceId]) {
    return SOURCE_DISPLAY_NAMES[sourceId as Slice1SourceId];
  }
  return sourceId;
}

export function getMetricById(metricId: string): (typeof SLICE_1_METRICS)[number] | undefined {
  return SLICE_1_METRICS.find((m) => m.id === metricId);
}

export function getAllowedSourcesForMetric(metricId: string): Slice1SourceId[] {
  const allowed = METRIC_ALLOWED_SOURCES[metricId as Slice1MetricId];
  return allowed ? [...allowed] : [];
}

/** Metrics each source can provide (for Connected Source Detail). */
export const SOURCE_PROVIDES_METRICS: Record<Slice1SourceId, Slice1MetricId[]> = {
  withings: ["weight", "body_fat_percent"],
  apple_health: ["steps", "activity_minutes", "hrv", "sleep_duration"],
  oura: ["sleep_duration", "hrv"],
  manual: ["weight", "body_fat_percent", "steps", "activity_minutes", "hrv", "sleep_duration"],
  upload: ["uploads", "lab_results"],
  labs: ["lab_results"],
};
