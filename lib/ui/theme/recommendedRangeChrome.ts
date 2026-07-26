/**
 * Semantic chrome for scientific recommended-range zones (e.g. Sleep Duration bar).
 * Distinct from action-success / rating badges — labels remain the primary signal.
 */

import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";

export type RecommendedRangeChrome = {
  /** Strong fill for the recommended center zone. */
  recommendedFill: string;
  /** Optional border/highlight around the recommended zone. */
  recommendedBorder: string;
  /** Muted fill for below / above context zones. */
  outerFill: string;
  /** Slightly softer outer fill for the above-typical side. */
  outerFillSoft: string;
};

export const RECOMMENDED_RANGE_CHROME_DARK: RecommendedRangeChrome = {
  recommendedFill: "rgba(52, 211, 153, 0.72)",
  recommendedBorder: "rgba(110, 231, 183, 0.95)",
  outerFill: "rgba(148, 163, 184, 0.34)",
  outerFillSoft: "rgba(148, 163, 184, 0.26)",
};

export const RECOMMENDED_RANGE_CHROME_LIGHT: RecommendedRangeChrome = {
  recommendedFill: "rgba(22, 163, 74, 0.55)",
  recommendedBorder: "rgba(21, 128, 61, 0.85)",
  outerFill: "rgba(100, 116, 139, 0.28)",
  outerFillSoft: "rgba(100, 116, 139, 0.2)",
};

/** Defaults to dark (metric detail sheets use elevated dark surfaces today). */
export function resolveRecommendedRangeChrome(
  mode: OliThemeMode = "dark",
): RecommendedRangeChrome {
  return mode === "light" ? RECOMMENDED_RANGE_CHROME_LIGHT : RECOMMENDED_RANGE_CHROME_DARK;
}

/** Active dark recommended-range fill token for Duration / metric reference bars. */
export const UI_RECOMMENDED_RANGE_FILL = RECOMMENDED_RANGE_CHROME_DARK.recommendedFill;
export const UI_RECOMMENDED_RANGE_BORDER = RECOMMENDED_RANGE_CHROME_DARK.recommendedBorder;
export const UI_REFERENCE_ZONE_NEUTRAL_FILL = RECOMMENDED_RANGE_CHROME_DARK.outerFill;
export const UI_REFERENCE_ZONE_NEUTRAL_FILL_SOFT = RECOMMENDED_RANGE_CHROME_DARK.outerFillSoft;
