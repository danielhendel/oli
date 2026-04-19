/**
 * Display-only progress (0–1) for Oli sleep fact metrics. For UI quality hints, not clinical labels.
 * Each rule is fixed and deterministic; safe to show on a phone for day-to-day scan.
 */

/**
 * Main/total sleep duration: 5h (300m) → 0, 9h (540m) → 1, linear, clamped.
 * Slightly below 5h reads as low; 7.5h+ reads as strong in the bar.
 */
export function sleepTotalMinutesBarProgress(totalMinutes: number | null | undefined): number | null {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return null;
  const low = 300;
  const high = 540;
  const t = (totalMinutes - low) / (high - low);
  return Math.max(0, Math.min(1, t));
}

/**
 * Sleep efficiency: Oli stores 0–1 (aggregate mean). If a 0–100 value appears, it is treated as a percent.
 */
export function sleepEfficiencyBarProgress(efficiency: number | null | undefined): number | null {
  if (efficiency == null || !Number.isFinite(efficiency)) return null;
  const r = efficiency > 1 ? efficiency / 100 : efficiency;
  return Math.max(0, Math.min(1, r));
}

/**
 * Sleep latency: lower is better. ~5m or less → full bar, ~45m+ → empty, linear between, clamped.
 */
export function sleepLatencyMinutesBarProgress(latencyMinutes: number | null | undefined): number | null {
  if (latencyMinutes == null || !Number.isFinite(latencyMinutes)) return null;
  const good = 5;
  const bad = 45;
  const t = (latencyMinutes - good) / (bad - good);
  return Math.max(0, Math.min(1, 1 - t));
}

/**
 * REM sleep minutes: 45m → 0, 120m → 1, linear, clamped (broad “typical night” display band).
 */
export function sleepRemMinutesBarProgress(remMinutes: number | null | undefined): number | null {
  if (remMinutes == null || !Number.isFinite(remMinutes)) return null;
  const low = 45;
  const high = 120;
  const t = (remMinutes - low) / (high - low);
  return Math.max(0, Math.min(1, t));
}

/**
 * Deep sleep minutes: 30m → 0, 90m → 1, linear, clamped.
 */
export function sleepDeepMinutesBarProgress(deepMinutes: number | null | undefined): number | null {
  if (deepMinutes == null || !Number.isFinite(deepMinutes)) return null;
  const low = 30;
  const high = 90;
  const t = (deepMinutes - low) / (high - low);
  return Math.max(0, Math.min(1, t));
}
