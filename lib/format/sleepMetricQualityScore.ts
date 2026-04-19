/**
 * Display-only 0–100 “quality” scores for sleep facts, mapped to Oura-style tier labels
 * via {@link scoreToRatingLabel}. Bands align with {@link sleepMetricBarProgress} endpoints where noted.
 */

/**
 * Total sleep minutes → 0–100 (same endpoints as {@link sleepTotalMinutesBarProgress}: 300→0, 540→1).
 */
export function totalSleepMinutesToQualityScore(totalMinutes: number | null | undefined): number | null {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return null;
  const low = 300;
  const high = 540;
  const t = (totalMinutes - low) / (high - low);
  return Math.max(0, Math.min(100, Math.round(t * 100)));
}

/**
 * Efficiency ratio (0–1 or 0–100) → 0–100 on the Oura score scale for label bucketing.
 */
export function sleepEfficiencyToQualityScore(ratio: number | null | undefined): number | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  const pct = ratio > 1 ? ratio : ratio * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Latency minutes → 0–100 where lower latency scores higher (same invert band as latency bar: 5→100, 45→0).
 */
export function sleepLatencyMinutesToQualityScore(latencyMinutes: number | null | undefined): number | null {
  if (latencyMinutes == null || !Number.isFinite(latencyMinutes)) return null;
  const good = 5;
  const bad = 45;
  const raw = (latencyMinutes - good) / (bad - good);
  const inverted = 1 - Math.max(0, Math.min(1, raw));
  return Math.round(inverted * 100);
}

/**
 * REM minutes → 0–100 (45→0, 120→100, same span as REM bar).
 */
export function remSleepMinutesToQualityScore(remMinutes: number | null | undefined): number | null {
  if (remMinutes == null || !Number.isFinite(remMinutes)) return null;
  const low = 45;
  const high = 120;
  const t = (remMinutes - low) / (high - low);
  return Math.max(0, Math.min(100, Math.round(t * 100)));
}

/**
 * Deep sleep minutes → 0–100 (30→0, 90→100, same span as deep bar).
 */
export function deepSleepMinutesToQualityScore(deepMinutes: number | null | undefined): number | null {
  if (deepMinutes == null || !Number.isFinite(deepMinutes)) return null;
  const low = 30;
  const high = 90;
  const t = (deepMinutes - low) / (high - low);
  return Math.max(0, Math.min(100, Math.round(t * 100)));
}
