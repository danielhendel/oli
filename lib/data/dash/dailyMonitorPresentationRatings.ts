/**
 * Pure Daily Monitor presentation ratings (UI-only).
 * Not Health State, not medical grades, not absolute-kcal classifiers.
 */

import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import { getStepRatingActivityDescriptorPill } from "@/lib/utils/activityStepRating";

/** Semantic presentation tones for Oura provider rating badges (Sleep / Readiness only). */
export type DailyMonitorRatingTone = "critical" | "caution" | "positive" | "optimal";

/**
 * Maps an existing Oura provider rating label to a presentation tone.
 * Does not inspect numeric scores and does not duplicate provider thresholds.
 * Unknown / absent labels fail closed (null) — never invent a positive tone.
 */
export function mapOuraProviderRatingToTone(
  ratingLabel: OuraRatingLabel | string | null | undefined,
): DailyMonitorRatingTone | null {
  if (ratingLabel == null) return null;
  switch (ratingLabel) {
    case "Pay attention":
      return "critical";
    case "Fair":
      return "caution";
    case "Good":
      return "positive";
    case "Optimal":
      return "optimal";
    default: {
      const _exhaustive: string = ratingLabel;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Current-day Activity descriptor with in-progress wording.
 * Reuses Activity Today classifier labels; appends ` so far` for unfinished day semantics.
 */
export function buildDailyMonitorActivityRatingLabel(steps: number): {
  label: string;
  accessibilityLabel: string;
} {
  const base = getStepRatingActivityDescriptorPill(steps).label;
  const label = `${base} so far`;
  return {
    label,
    accessibilityLabel: `Activity level ${label}.`,
  };
}

/**
 * Maps mean set RPE / average intensity on the documented 0–10 relative-exertion scale
 * (from journal/ingest set `intensity` / RPE fields) to a Monitor intensity label.
 *
 * Scale contract (product Phase 2C compact cards), half-open bands:
 * - [0, 5) → Low
 * - [5, 7) → Moderate
 * - [7, 9) → High
 * - [9, 10] → Very High
 *
 * Aligns with integer bands 0–4 / 5–6 / 7–8 / 9–10 for whole RPE values.
 */
export function mapWorkoutAverageIntensityToLabel(
  averageIntensity: number | null | undefined,
): { label: string; accessibilityLabel: string } | null {
  if (typeof averageIntensity !== "number" || !Number.isFinite(averageIntensity)) return null;
  if (averageIntensity < 0 || averageIntensity > 10) return null;
  const n = averageIntensity;
  let label: string;
  if (n < 5) label = "Low";
  else if (n < 7) label = "Moderate";
  else if (n < 9) label = "High";
  else label = "Very High";
  return {
    label,
    accessibilityLabel: `Workout intensity ${label}.`,
  };
}

/**
 * Energy expenditure presentation badge when no normalized PAL/activity-level classifier exists.
 * Neutral presentation — not a health grade.
 */
export function buildDailyMonitorEnergyEstimatedRating(): {
  label: "Estimated";
  accessibilityLabel: string;
} {
  return {
    label: "Estimated",
    accessibilityLabel: "Estimated energy expenditure level: Estimated.",
  };
}

/** Neutral provider source announcement (distinct from the rating label). */
export function buildOuraProviderSourceAccessibility(): string {
  return "Source: Oura";
}

/** Rating-only announcement — does not include provider source or color names. */
export function buildOuraRatingAccessibility(ratingLabel: string): string {
  return `Rating ${ratingLabel}.`;
}

/**
 * @deprecated Prefer {@link buildOuraRatingAccessibility} + separate source announcement.
 * Kept for call-site migration; does not include color names.
 */
export function buildOuraScoreRatingAccessibility(input: {
  domain: "sleep" | "readiness";
  ratingLabel: string;
}): string {
  void input.domain;
  return buildOuraRatingAccessibility(input.ratingLabel);
}
