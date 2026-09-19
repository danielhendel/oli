/**
 * Apple Health per-metric Oli sync-scope registry.
 *
 * Distinguishes:
 * - HealthKit permission truth (system / Apple Health)
 * - Oli sync scope (in-app toggles — what Oli may read/use for this account)
 *
 * Only lists consumer metrics that are implemented today. No speculative types.
 */

import type { AppleHealthDomainScopeId } from "@/lib/integrations/appleHealth/storage";

export type AppleHealthMetricSyncId =
  | "weight"
  | "bodyFat"
  | "leanTissue"
  | "steps"
  | "distance"
  | "activeEnergy"
  | "exerciseMinutes"
  | "workouts"
  | "heartRate"
  | "restingHeartRate";

export type AppleHealthMetricSyncDefinition = {
  readonly id: AppleHealthMetricSyncId;
  readonly domain: AppleHealthDomainScopeId;
  /** Consumer-facing row label. */
  readonly displayName: string;
  /** Body sheet label when different (e.g. "Body Fat" vs "Body Fat Percentage"). */
  readonly sheetLabel?: string;
};

export type AppleHealthMetricSyncGroupId =
  | "body"
  | "activity"
  | "workouts"
  | "cardioVitals";

export type AppleHealthMetricSyncGroup = {
  readonly id: AppleHealthMetricSyncGroupId;
  readonly title: string;
  readonly metrics: readonly AppleHealthMetricSyncDefinition[];
};

export const APPLE_HEALTH_METRIC_SYNC_REGISTRY: readonly AppleHealthMetricSyncDefinition[] = [
  { id: "weight", domain: "body", displayName: "Weight", sheetLabel: "Weight" },
  {
    id: "bodyFat",
    domain: "body",
    displayName: "Body Fat Percentage",
    sheetLabel: "Body Fat",
  },
  {
    id: "leanTissue",
    domain: "body",
    displayName: "Lean Body Mass",
    sheetLabel: "Lean Mass",
  },
  { id: "steps", domain: "activity", displayName: "Steps" },
  { id: "distance", domain: "activity", displayName: "Walking + Running Distance" },
  { id: "activeEnergy", domain: "activity", displayName: "Active Energy" },
  { id: "exerciseMinutes", domain: "activity", displayName: "Exercise Minutes" },
  { id: "workouts", domain: "workouts", displayName: "Workouts" },
  { id: "heartRate", domain: "cardioVitals", displayName: "Heart Rate" },
  { id: "restingHeartRate", domain: "cardioVitals", displayName: "Resting Heart Rate" },
] as const;

export const APPLE_HEALTH_METRIC_SYNC_GROUPS: readonly AppleHealthMetricSyncGroup[] = [
  {
    id: "body",
    title: "Body Composition",
    metrics: APPLE_HEALTH_METRIC_SYNC_REGISTRY.filter((m) => m.domain === "body"),
  },
  {
    id: "activity",
    title: "Activity",
    metrics: APPLE_HEALTH_METRIC_SYNC_REGISTRY.filter((m) => m.domain === "activity"),
  },
  {
    id: "workouts",
    title: "Workouts",
    metrics: APPLE_HEALTH_METRIC_SYNC_REGISTRY.filter((m) => m.domain === "workouts"),
  },
  {
    id: "cardioVitals",
    title: "Cardio & Vitals",
    metrics: APPLE_HEALTH_METRIC_SYNC_REGISTRY.filter((m) => m.domain === "cardioVitals"),
  },
] as const;

export const BODY_APPLE_HEALTH_METRIC_SYNC_IDS = [
  "weight",
  "bodyFat",
  "leanTissue",
] as const satisfies readonly AppleHealthMetricSyncId[];

export function getAppleHealthMetricSyncDefinition(
  id: AppleHealthMetricSyncId,
): AppleHealthMetricSyncDefinition {
  const found = APPLE_HEALTH_METRIC_SYNC_REGISTRY.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown Apple Health metric sync id: ${id}`);
  return found;
}

export function listAppleHealthMetricsForDomain(
  domain: AppleHealthDomainScopeId,
): readonly AppleHealthMetricSyncDefinition[] {
  return APPLE_HEALTH_METRIC_SYNC_REGISTRY.filter((m) => m.domain === domain);
}

export function bodySheetMetricIdFromLabel(label: string): AppleHealthMetricSyncId | null {
  const hit = APPLE_HEALTH_METRIC_SYNC_REGISTRY.find(
    (m) => m.sheetLabel === label || m.displayName === label,
  );
  return hit?.id ?? null;
}
