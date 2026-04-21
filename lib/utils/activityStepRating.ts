/**
 * Step-count rating tiers for Activity overview / Today’s Steps pills (UI-only benchmarks).
 */

import { ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX } from "@/lib/ui/overview/activityStepTierBarFills";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";

/** Parses a formatted digit string (e.g. `7,919`) for rating thresholds. */
export function stepsFromLocaleDigitString(digits: string): number {
  const n = Number.parseInt(digits.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export type ActivityStepRatingTierDefinition = {
  label: string;
  /** Human-readable step/day band for explainer UI. */
  rangeDisplay: string;
  meaning: string;
  /** Pill text color (darker). */
  color: string;
  /** Soft pill fill. */
  backgroundColor: string;
};

const ACTIVITY_STEP_RATING_TIER_META = [
  { label: "Low", rangeDisplay: "< 5,000", meaning: "Sedentary" },
  { label: "Below Avg", rangeDisplay: "5,000–7,499", meaning: "Lightly active" },
  { label: "Average", rangeDisplay: "7,500–9,999", meaning: "Moderately active" },
  { label: "Good", rangeDisplay: "10,000–12,499", meaning: "Active" },
  { label: "Great", rangeDisplay: "12,500–14,999", meaning: "Very active" },
  { label: "Elite", rangeDisplay: "15,000+", meaning: "Highly active" },
] as const;

/**
 * Canonical tier order (Low → Elite). Thresholds match {@link getStepRating} / {@link getStepRatingTierIndex}.
 * Pill chrome follows Body / Strength segments except **Good** and **Great**, which use distinct Activity greens.
 */
export const ACTIVITY_STEP_RATING_TIERS: readonly ActivityStepRatingTierDefinition[] =
  ACTIVITY_STEP_RATING_TIER_META.map((m, i) => {
    if (i === 2) {
      /** Moderately Active (Average): softer wash than default segment chrome for pill hierarchy. */
      return {
        ...m,
        color: "#D89550",
        backgroundColor: "#FCFAF6",
      };
    }
    if (i === 3) {
      /** Active (Good): calmer than Very Active — same hue family, lower chroma for clearer tier ladder. */
      return {
        ...m,
        color: "#6BA38A",
        backgroundColor: "#F3F7F5",
      };
    }
    if (i === 4) {
      return {
        ...m,
        color: "#4ED26F",
        /** Slightly richer wash than Good for hierarchy (still soft, premium). */
        backgroundColor: "#E5F8EB",
      };
    }
    const seg = ACTIVITY_STEP_TIER_BODY_SEGMENT_INDEX[i]!;
    const chrome = MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[seg];
    return {
      ...m,
      color: chrome.pillFg,
      backgroundColor: chrome.pillBg,
    };
  });

export type ActivityStepRating = {
  label: string;
  /** Pill text color (darker). */
  color: string;
  /** Soft pill fill. */
  backgroundColor: string;
};

/**
 * Tier index 0–5 for `steps` (Low → Elite).
 */
export function getStepRatingTierIndex(steps: number): number {
  const n = Number.isFinite(steps) ? Math.max(0, Math.floor(steps)) : 0;
  if (n < 5000) return 0;
  if (n < 7500) return 1;
  if (n < 10000) return 2;
  if (n < 12500) return 3;
  if (n < 15000) return 4;
  return 5;
}

/** Marker position along the 6-band ladder (center of the active band), 0–1. */
export function stepRatingTierMarkerPosition01(steps: number): number {
  const i = getStepRatingTierIndex(steps);
  return (i + 0.5) / ACTIVITY_STEP_RATING_TIERS.length;
}

/**
 * Maps a step count to a display rating. Thresholds are daily-step benchmarks (same scale for
 * “today total” and “average steps/day” rows).
 */
export function getStepRating(steps: number): ActivityStepRating {
  const d = ACTIVITY_STEP_RATING_TIERS[getStepRatingTierIndex(steps)]!;
  return {
    label: d.label,
    color: d.color,
    backgroundColor: d.backgroundColor,
  };
}

/**
 * Activity module UI: tier thresholds and chrome match {@link getStepRating}; pill text uses
 * public activity descriptors (Overview / Today / Yesterday / Activity tier legends).
 */
export const ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Active",
  "Very Active",
  "Highly Active",
] as const;

/**
 * Step bands for Activity tier legends (index matches {@link getStepRatingTierIndex}).
 * Tier 0 uses public phrasing; tiers 1–5 reuse {@link ACTIVITY_STEP_RATING_TIERS} `rangeDisplay` so labels stay aligned
 * with the thresholds in {@link getStepRatingTierIndex} (single numeric source of truth).
 */
export const ACTIVITY_STEP_DESCRIPTOR_RANGE_LINES = [
  "under 5,000",
  ACTIVITY_STEP_RATING_TIERS[1]!.rangeDisplay,
  ACTIVITY_STEP_RATING_TIERS[2]!.rangeDisplay,
  ACTIVITY_STEP_RATING_TIERS[3]!.rangeDisplay,
  ACTIVITY_STEP_RATING_TIERS[4]!.rangeDisplay,
  ACTIVITY_STEP_RATING_TIERS[5]!.rangeDisplay,
] as const;

export function getActivityStepDescriptorLabelForTierIndex(tierIndex: number): string {
  const clamped = Math.min(
    Math.max(Math.floor(tierIndex), 0),
    ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS.length - 1,
  );
  return ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS[clamped]!;
}

/** Same colors as {@link getStepRating}; label is {@link ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS} for the tier. */
export function getStepRatingActivityDescriptorPill(steps: number): ActivityStepRating {
  const base = getStepRating(steps);
  const i = getStepRatingTierIndex(steps);
  return {
    ...base,
    label: ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS[i]!,
  };
}
