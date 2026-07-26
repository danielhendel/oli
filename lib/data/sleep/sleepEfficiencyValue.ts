/**
 * Vendor-provided Sleep Efficiency normalization (Phase 2E-D).
 *
 * SleepNight.efficiency is wearable-reported. Oli must not recompute from time
 * asleep ÷ time in bed (SleepNight does not expose timeInBedMinutes).
 *
 * Dual-scale contract (matches {@link formatEfficiencyRatio}):
 * - finite 0–1 → percentage (×100)
 * - finite >1 and ≤100 → already a percentage
 * - invalid / missing → null (never substitute 0)
 *
 * Pure domain: no React, I/O, or Firebase.
 */

import { formatEfficiencyRatio } from "@/lib/format/sleepDisplay";

export type SleepEfficiencyPercent = {
  /** Unrounded 0–100 percentage for classification and averages. */
  normalizedPercent: number;
  /** Integer display percentage. */
  displayPercent: number;
  /** Consumer display string, e.g. "93%". */
  formatted: string;
};

/**
 * Normalize a vendor efficiency value to a 0–100 percentage.
 * Returns null for missing or malformed input — never clamps into range.
 */
export function resolveSleepEfficiencyPercent(
  value: unknown,
): SleepEfficiencyPercent | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return null;

  let normalizedPercent: number;
  if (value <= 1) {
    normalizedPercent = value * 100;
  } else if (value <= 100) {
    normalizedPercent = value;
  } else {
    return null;
  }

  if (!Number.isFinite(normalizedPercent) || normalizedPercent < 0 || normalizedPercent > 100) {
    return null;
  }

  const displayPercent = Math.round(normalizedPercent);
  return {
    normalizedPercent,
    displayPercent,
    formatted: `${displayPercent}%`,
  };
}

/** Format a normalized percentage for display; null → "—". */
export function formatSleepEfficiencyPercent(
  normalizedPercent: number | null | undefined,
): string {
  if (normalizedPercent == null || !Number.isFinite(normalizedPercent)) return "—";
  return formatEfficiencyRatio(
    normalizedPercent <= 1 ? normalizedPercent / 100 : normalizedPercent,
  );
}

/**
 * Resolve efficiency from an attributed SleepNight field only.
 * Does not accept duration, latency, awake time, or time-in-bed inputs.
 */
export function resolveSleepEfficiencyFromNightField(
  efficiency: unknown,
): SleepEfficiencyPercent | null {
  return resolveSleepEfficiencyPercent(efficiency);
}
