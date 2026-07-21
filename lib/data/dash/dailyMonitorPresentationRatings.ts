/**
 * Pure Daily Monitor presentation ratings (UI-only).
 * Not Health State, not medical grades, not absolute-kcal classifiers.
 */

import { getStepRatingActivityDescriptorPill } from "@/lib/utils/activityStepRating";

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

export function buildOuraScoreRatingAccessibility(input: {
  domain: "sleep" | "readiness";
  ratingLabel: string;
}): string {
  const noun = input.domain === "sleep" ? "sleep" : "readiness";
  return `Oura ${noun} rating: ${input.ratingLabel}`;
}
