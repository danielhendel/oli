/**
 * Body Fat Apple Health all-history boundary.
 *
 * Product (Stage 3C):
 * - 5Y selector = most recent five years of *stored* observations
 * - All selector = all available governed Body Fat history
 * - Import is NOT capped at five years — scan from the earliest safe boundary
 *   (or DOB when provided) to now.
 *
 * HealthKit launched with iOS 8 (~2014-09). Scanning before that is wasteful.
 * Never scan to year 1900.
 */

/** Conservative HealthKit-era floor (UTC). */
export const APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO = "2014-09-01T00:00:00.000Z";

/**
 * Half-year chunks for sparse Body Fat (2017 → gap → 2024…).
 * Empty windows advance the cursor; they must never terminate the scan.
 */
export const APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_DAYS = 182;

/** Per-chunk HealthKit sample limit — if hit, window is bisected and retried. */
export const APPLE_HEALTH_BODY_FAT_HISTORY_CHUNK_LIMIT = 500;

/**
 * Resolve the earliest ISO start for Body Fat historical discovery/import.
 * Prefer a valid DOB when provided; never earlier than the HealthKit-era floor.
 */
export function resolveBodyFatHistorySearchBoundary(args: {
  readonly nowIso: string;
  readonly dateOfBirthIso?: string | null;
}): string {
  const floor = APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO;
  const dob = args.dateOfBirthIso;
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}/.test(dob)) {
    const dobIso = dob.includes("T") ? dob : `${dob.slice(0, 10)}T00:00:00.000Z`;
    const dobMs = Date.parse(dobIso);
    const floorMs = Date.parse(floor);
    const nowMs = Date.parse(args.nowIso);
    if (Number.isFinite(dobMs) && dobMs < nowMs && dobMs >= floorMs) {
      return new Date(dobMs).toISOString();
    }
    if (Number.isFinite(dobMs) && dobMs < floorMs) {
      return floor;
    }
  }
  return floor;
}
