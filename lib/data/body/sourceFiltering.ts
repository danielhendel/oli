import { isAppleHealthBodyReadSourceId } from "@oli/contracts/bodyReadSources";

export type BodyMetricSourceMetric =
  | "weight"
  | "body_fat_percent"
  | "bmi"
  | "lean_body_mass"
  | "resting_metabolic_rate";

const APPLE_HEALTH_SOURCE = "apple_health";
const APPLE_HEALTH_SOURCE_ALIASES = new Set(["apple_health", "healthkit"]);

/** Re-export for Body hooks (strict Apple Health–only read path). */
export { isAppleHealthBodyReadSourceId };

/** Keep only raw rows whose `sourceId` is Apple Health / HealthKit (excludes Withings, manual, etc.). */
export function filterToAppleHealthBodyReadSources<T extends { sourceId: string }>(rows: readonly T[]): T[] {
  return rows.filter((r) => isAppleHealthBodyReadSourceId(r.sourceId));
}

const LEGACY_BODY_SOURCE_IDS_EXCLUDED = new Set(["withings"]);

export function preferredBodyMetricSource(
  metricSources: Record<string, string> | undefined,
  metric: BodyMetricSourceMetric,
): string {
  const preferred = metricSources?.[metric];
  if (typeof preferred === "string" && preferred.length > 0) {
    if (LEGACY_BODY_SOURCE_IDS_EXCLUDED.has(preferred)) return APPLE_HEALTH_SOURCE;
    return preferred;
  }
  return APPLE_HEALTH_SOURCE;
}

export function sourceMatchesPreferredBodySource(sourceId: string, preferredSourceId: string): boolean {
  if (preferredSourceId === APPLE_HEALTH_SOURCE) {
    return APPLE_HEALTH_SOURCE_ALIASES.has(sourceId);
  }
  return sourceId === preferredSourceId;
}
