/**
 * Body Composition Apple Health metric registry — card ↔ popup ↔ HealthKit ↔ scope.
 * Identifiers come from the domain registry; no raw HK strings in screens.
 */

import {
  APPLE_HEALTH_BODY_READ_TYPES,
  type AppleHealthReadType,
} from "@/lib/integrations/appleHealth/appleHealthDomainRegistry";
import type { AppleHealthMetricSyncId } from "@/lib/integrations/appleHealth/appleHealthMetricSyncScope";

export type BodyAppleHealthMetricId = "weight" | "bodyFat" | "leanTissue";

export type BodyAppleHealthMetricDefinition = {
  readonly id: BodyAppleHealthMetricId;
  readonly cardTitle: string;
  readonly popupTitle: string;
  readonly settingsLabel: string;
  readonly appleHealthReadType: AppleHealthReadType;
  /** Key in appleHealth:metricSyncScopes:{uid} — must stay stable. */
  readonly scopeKey: Extract<AppleHealthMetricSyncId, "weight" | "bodyFat" | "leanTissue">;
  readonly unitKind: "mass" | "percentage";
  readonly connectVerb: string;
};

const [BODY_MASS, BODY_FAT_PCT, LEAN_BODY_MASS] = APPLE_HEALTH_BODY_READ_TYPES;

export const BODY_APPLE_HEALTH_METRIC_REGISTRY: readonly BodyAppleHealthMetricDefinition[] = [
  {
    id: "weight",
    cardTitle: "Weight",
    popupTitle: "Weight",
    settingsLabel: "Weight",
    appleHealthReadType: BODY_MASS!,
    scopeKey: "weight",
    unitKind: "mass",
    connectVerb: "Connect Weight",
  },
  {
    id: "bodyFat",
    cardTitle: "Body Fat",
    popupTitle: "Body Fat",
    settingsLabel: "Body Fat Percentage",
    appleHealthReadType: BODY_FAT_PCT!,
    scopeKey: "bodyFat",
    unitKind: "percentage",
    connectVerb: "Connect Body Fat",
  },
  {
    id: "leanTissue",
    cardTitle: "Lean Mass",
    popupTitle: "Lean Mass",
    settingsLabel: "Lean Body Mass",
    appleHealthReadType: LEAN_BODY_MASS!,
    scopeKey: "leanTissue",
    unitKind: "mass",
    connectVerb: "Connect Lean Mass",
  },
] as const;

export function getBodyAppleHealthMetricDefinition(
  id: BodyAppleHealthMetricId,
): BodyAppleHealthMetricDefinition {
  const found = BODY_APPLE_HEALTH_METRIC_REGISTRY.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown Body Apple Health metric: ${id}`);
  return found;
}

export function bodyAppleHealthMetricIdFromCardMetric(
  cardMetric: string,
): BodyAppleHealthMetricId | null {
  if (cardMetric === "weight" || cardMetric === "bodyFat" || cardMetric === "leanTissue") {
    return cardMetric;
  }
  return null;
}

export function bodyMetricIncludeFlags(
  id: BodyAppleHealthMetricId,
): { weight: boolean; bodyFat: boolean; leanTissue: boolean } {
  return {
    weight: id === "weight",
    bodyFat: id === "bodyFat",
    leanTissue: id === "leanTissue",
  };
}
