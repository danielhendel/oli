/**
 * Oura-style score and contributor display helpers.
 * Deterministic, used by Sleep and Readiness detail screens.
 */

export type OuraRatingLabel =
  | "Optimal"
  | "Good"
  | "Fair"
  | "Pay attention";

/**
 * Normalize a candidate Oura-style score to a finite integer in 0–100.
 * Returns null for missing, non-finite, or out-of-range values (does not coerce).
 * Score `0` is valid.
 */
export function normalizeOuraScore0to100(score: unknown): number | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  return Math.round(score);
}

/**
 * Map a validated 0–100 score to legacy Oli rating bands (Fair starts at 55).
 * Prefer {@link classifyOuraProviderScore} for provider-sourced Oura Sleep / Readiness scores.
 */
export function scoreToRatingLabel(score: number | null | undefined): OuraRatingLabel {
  if (score == null || typeof score !== "number" || !Number.isFinite(score)) return "Pay attention";
  if (score >= 85) return "Optimal";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Pay attention";
}

/**
 * Oura provider Sleep / Readiness score bands (product-accurate):
 * 85–100 Optimal, 70–84 Good, 60–69 Fair, 0–59 Pay attention.
 * Accepts only finite integers already normalized to 0–100; score `0` is valid.
 */
export function classifyOuraProviderScore(score: number): OuraRatingLabel {
  if (score >= 85) return "Optimal";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Pay attention";
}

/**
 * Presentation classification for provider-sourced Oura Sleep / Readiness scores.
 * Returns null when the input is not a valid 0–100 score (never invents a rating).
 */
export function tryClassifyOuraScore(score: unknown): OuraRatingLabel | null {
  const n = normalizeOuraScore0to100(score);
  if (n == null) return null;
  return classifyOuraProviderScore(n);
}

/**
 * Map a contributor value (typically 0–100) to progress 0–1 for bar display.
 */
export function contributorValueToProgress(value: unknown): number {
  if (value == null) return 0;
  if (typeof value !== "number") return 0;
  const t = value / 100;
  return Math.max(0, Math.min(1, t));
}

/**
 * Rating label for a single contributor value (0–100).
 */
export function contributorValueToRatingLabel(value: unknown): OuraRatingLabel {
  const n = normalizeOuraScore0to100(value);
  if (n == null) return "Pay attention";
  return classifyOuraProviderScore(n);
}

const DASH = "—";

/**
 * Format sleep duration in minutes as "7h 30m" (or "45m" when < 60).
 */
export function formatSleepDurationMinutes(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || typeof totalMinutes !== "number") return DASH;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format contributor value for display. Handles known Oura keys with units where applicable.
 */
export function formatContributorDisplayValue(key: string, value: unknown): string {
  if (value == null) return DASH;
  if (typeof value === "number") {
    if (key === "total_sleep" || key === "sleep") return `${Math.round(value)}`;
    if (
      key === "efficiency" ||
      key === "restfulness" ||
      key === "rem_sleep" ||
      key === "deep_sleep" ||
      key === "latency" ||
      key === "timing" ||
      key === "hrv_balance" ||
      key === "recovery_index" ||
      key === "sleep_balance" ||
      key === "sleep_regularity" ||
      key === "activity_balance"
    )
      return `${Math.round(value)}`;
    if (key === "resting_heart_rate") return `${Math.round(value)} bpm`;
    if (key === "body_temperature")
      return value % 1 === 0 ? `${value}°` : `${value.toFixed(1)}°`;
    if (key === "previous_day_activity") return `${Math.round(value)}`;
    return `${Math.round(value)}`;
  }
  if (typeof value === "string") return value;
  return String(value);
}

/** Ordered sleep contributor keys and display labels (Oura-style). */
export const SLEEP_CONTRIBUTOR_KEYS: { key: string; label: string }[] = [
  { key: "total_sleep", label: "Total sleep" },
  { key: "efficiency", label: "Efficiency" },
  { key: "restfulness", label: "Restfulness" },
  { key: "rem_sleep", label: "REM sleep" },
  { key: "deep_sleep", label: "Deep sleep" },
  { key: "latency", label: "Latency" },
  { key: "timing", label: "Timing" },
];

/** Ordered readiness contributor keys and display labels (Oura-style). */
export const READINESS_CONTRIBUTOR_KEYS: { key: string; label: string }[] = [
  { key: "resting_heart_rate", label: "Resting heart rate" },
  { key: "hrv_balance", label: "HRV balance" },
  { key: "body_temperature", label: "Body temperature" },
  { key: "recovery_index", label: "Recovery index" },
  { key: "sleep", label: "Sleep" },
  { key: "sleep_balance", label: "Sleep balance" },
  { key: "sleep_regularity", label: "Sleep regularity" },
  { key: "previous_day_activity", label: "Previous day activity" },
  { key: "activity_balance", label: "Activity balance" },
];
