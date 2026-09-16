// lib/home/healthPerformanceCategories.ts
import type { Href } from "expo-router";

/**
 * Stage 2 consumer Home category entry — presentation IA only.
 * Does not change schema semantics or delete Activity/Movement data.
 */

export const HEALTH_PERFORMANCE_CATEGORY_IDS = [
  "body_composition",
  "strength",
  "cardio_fitness",
  "nutrition",
  "sleep",
  "recovery",
  "health",
] as const;

export type HealthPerformanceCategoryId = (typeof HEALTH_PERFORMANCE_CATEGORY_IDS)[number];

export type HealthPerformanceCategoryStatus =
  | "set_up"
  | "no_data_yet"
  | "data_available"
  | "syncing"
  | "temporarily_unavailable";

export type HealthPerformanceCategoryDefinition = {
  id: HealthPerformanceCategoryId;
  label: string;
  href: Href;
  /** Short accessibility hint for navigation. */
  accessibilityHint: string;
};

/**
 * Exact consumer order and labels. Tests lock this contract.
 * Movement / Activity is intentionally absent from this map.
 */
export const HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS: readonly HealthPerformanceCategoryDefinition[] =
  [
    {
      id: "body_composition",
      label: "Body Composition",
      href: "/(app)/body" as Href,
      accessibilityHint: "Opens body composition",
    },
    {
      id: "strength",
      label: "Strength",
      href: "/(app)/workouts" as Href,
      accessibilityHint: "Opens strength and workouts",
    },
    {
      id: "cardio_fitness",
      label: "Cardio Fitness",
      href: "/(app)/cardio" as Href,
      accessibilityHint: "Opens cardio fitness",
    },
    {
      id: "nutrition",
      label: "Nutrition",
      href: "/(app)/nutrition" as Href,
      accessibilityHint: "Opens nutrition",
    },
    {
      id: "sleep",
      label: "Sleep",
      href: "/(app)/recovery/sleep" as Href,
      accessibilityHint: "Opens sleep",
    },
    {
      id: "recovery",
      label: "Recovery",
      href: "/(app)/recovery" as Href,
      accessibilityHint: "Opens recovery",
    },
    {
      id: "health",
      label: "Health",
      href: "/(app)/labs" as Href,
      accessibilityHint: "Opens health and labs",
    },
  ] as const;

export type HealthPerformanceCategoryCardModel = {
  id: HealthPerformanceCategoryId;
  label: string;
  href: Href;
  accessibilityLabel: string;
  accessibilityHint: string;
  /** Omit when no safe lightweight status is available. */
  statusLabel: string | null;
};

const STATUS_LABELS: Record<HealthPerformanceCategoryStatus, string> = {
  set_up: "Set up",
  no_data_yet: "No data yet",
  data_available: "Data available",
  syncing: "Syncing",
  temporarily_unavailable: "Temporarily unavailable",
};

export function statusLabelFor(
  status: HealthPerformanceCategoryStatus | null | undefined,
): string | null {
  if (!status) return null;
  return STATUS_LABELS[status];
}

/**
 * Build Home category cards without mounting domain analytics.
 * Pass statuses only when derived from already-loaded lightweight state.
 */
export function buildHealthPerformanceCategoryCards(args?: {
  statuses?: Partial<Record<HealthPerformanceCategoryId, HealthPerformanceCategoryStatus | null>>;
}): HealthPerformanceCategoryCardModel[] {
  const statuses = args?.statuses ?? {};
  return HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS.map((def) => {
    const statusLabel = statusLabelFor(statuses[def.id] ?? null);
    const accessibilityLabel = statusLabel ? `${def.label}. ${statusLabel}` : def.label;
    return {
      id: def.id,
      label: def.label,
      href: def.href,
      accessibilityLabel,
      accessibilityHint: def.accessibilityHint,
      statusLabel,
    };
  });
}
