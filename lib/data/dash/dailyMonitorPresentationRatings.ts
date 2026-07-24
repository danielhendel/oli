/**
 * Pure Daily Monitor presentation ratings (UI-only).
 * Not Health State, not medical grades, not absolute-kcal classifiers.
 */

import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import {
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

/** Semantic presentation tones for Monitor rating badges (written label remains primary). */
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
 * Maps current-day Activity step descriptor tiers onto Monitor presentation tones.
 * Thresholds remain owned by {@link getStepRatingTierIndex} — this only picks chrome.
 * Color is supplemental; the written Activity descriptor remains the primary signal.
 */
export function mapActivityStepDescriptorToTone(steps: number): DailyMonitorRatingTone {
  const i = getStepRatingTierIndex(steps);
  if (i <= 0) return "critical";
  if (i <= 2) return "caution";
  if (i <= 4) return "positive";
  return "optimal";
}

/**
 * Current-day Activity step-category label (not a health or fitness-capacity grade).
 * Reuses Activity Today classifier labels exactly — no `so far` suffix.
 */
export function buildDailyMonitorActivityRatingLabel(steps: number): {
  label: string;
  accessibilityLabel: string;
  tone: DailyMonitorRatingTone;
} {
  const base = getStepRatingActivityDescriptorPill(steps).label;
  return {
    label: base,
    accessibilityLabel: `Activity level ${base}.`,
    tone: mapActivityStepDescriptorToTone(steps),
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
 * Energy Monitor has no top-right badge until a projected 24-hour TEE / age-gated PAL
 * contract exists. The current hybrid output mixes full-day baseline with activity so far
 * and must not be labeled Estimated, Low/Moderate/High, or used to derive PAL.
 */

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
