/**
 * Body module (weight / body composition read paths): only these raw `sourceId` values
 * are eligible. Excludes legacy Withings and other non–Apple Health ingest.
 *
 * Ingest uses `apple_health`; anchored HealthKit workout/body sync may use `healthkit`.
 */

export function isAppleHealthBodyReadSourceId(sourceId: string): boolean {
  return sourceId === "apple_health" || sourceId === "healthkit";
}
