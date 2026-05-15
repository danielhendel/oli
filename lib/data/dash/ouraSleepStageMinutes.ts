/** Raw Oura sleep stage payloads are usually seconds; values above the threshold are converted to minutes. */
export const OURA_SLEEP_STAGE_SECONDS_THRESHOLD = 200;

/**
 * Vendor sleep stage payloads are usually seconds; values at or below the threshold are treated as already in minutes.
 */
export function normalizeOuraSleepStageToMinutes(raw: number | undefined): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return undefined;
  if (raw > OURA_SLEEP_STAGE_SECONDS_THRESHOLD) return Math.round(raw / 60);
  return Math.round(raw);
}
