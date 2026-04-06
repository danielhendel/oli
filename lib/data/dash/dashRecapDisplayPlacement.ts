// lib/data/dash/dashRecapDisplayPlacement.ts
/**
 * Neutral **visual placement** along the shared 5-segment track (0–1 marker position).
 * These ratios are **not** clinical bands, goals, or validated interpretation — only UI scale
 * denominators so the Daily Recap bar can mirror Strength Overview **geometry** without implying
 * the same semantic tiers as the Strength Overview consistency bar.
 */
export const DASH_RECAP_DISPLAY_PLACEMENT_CAPS = {
  /** Steps denominator for bar fill only. */
  steps: 12_000,
  /** Sleep duration (minutes) denominator for bar fill only. */
  sleepMinutes: 600,
  /** Calorie denominator for bar fill only. */
  caloriesKcal: 4_000,
  /** Strength / cardio session-count denominator for bar fill only. */
  sessionCount: 6,
} as const;

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/** Marker position for a nonnegative value vs an explicit display cap. */
export function dashRecapPlacementMarker01(value: number, cap: number): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(cap) || cap <= 0) return 0;
  return clamp01(value / cap);
}
