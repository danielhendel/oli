/**
 * Overnight lowest heart rate validation (Phase 2F-B).
 *
 * Source field: SleepNight.lowestHeartRateBpm — wearable overnight lowest HR,
 * not daytime RHR, not Apple Health RHR, not average overnight HR, and never a
 * readiness contributor score (0–100).
 *
 * Valid display range matches Dash / SleepNight contracts: integer bpm in 30–220.
 * Missing / invalid → null (never substitute 0).
 *
 * Pure domain: no React, I/O, or Firebase.
 */

/** Inclusive physiological gates used by Dash readiness RHR display. */
export const RESTING_HEART_RATE_BPM_MIN = 30 as const;
export const RESTING_HEART_RATE_BPM_MAX = 220 as const;

export type RestingHeartRateBpm = {
  /** Unrounded finite bpm for classification and averages. */
  bpm: number;
  /** Integer display bpm (Math.round of source). */
  displayBpm: number;
  /** Consumer display string, e.g. "49 bpm". */
  formatted: string;
  /** Spoken form without "bpm" abbreviation. */
  accessibilityValue: string;
};

/**
 * Validate a candidate overnight lowest heart-rate value.
 * Returns null for missing, non-finite, or out-of-range inputs — never clamps into range.
 */
export function resolveRestingHeartRateBpm(value: unknown): RestingHeartRateBpm | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < RESTING_HEART_RATE_BPM_MIN || value > RESTING_HEART_RATE_BPM_MAX) return null;

  const displayBpm = Math.round(value);
  if (displayBpm < RESTING_HEART_RATE_BPM_MIN || displayBpm > RESTING_HEART_RATE_BPM_MAX) {
    return null;
  }

  return {
    bpm: value,
    displayBpm,
    formatted: formatRestingHeartRateBpm(displayBpm),
    accessibilityValue: `${displayBpm} beats per minute`,
  };
}

/** Format an already-validated integer bpm for display. */
export function formatRestingHeartRateBpm(displayBpm: number): string {
  return `${displayBpm} bpm`;
}

/**
 * Resolve overnight lowest HR from an attributed SleepNight field only.
 * Does not accept contributor scores, averageHeartRate, or DailyFacts RHR.
 */
export function resolveRestingHeartRateFromNightField(
  lowestHeartRateBpm: unknown,
): RestingHeartRateBpm | null {
  return resolveRestingHeartRateBpm(lowestHeartRateBpm);
}
