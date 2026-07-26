/**
 * Semantic chrome for scientific recommended-range zones (e.g. Sleep Duration bar)
 * and Your Pattern status text tones.
 *
 * Distinct from action-success / rating badges — written labels remain the primary signal.
 * Status text colors align with Monitor positive (green) / caution (amber) / neutral slate.
 */

import type { SleepDurationPatternStatusLabel } from "@/lib/data/sleep/sleepDurationReference";
import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import { DASH_MONITOR_RATING_TONE_CHROME_DARK, DASH_MONITOR_RATING_TONE_CHROME_LIGHT } from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";

export type RecommendedRangeChrome = {
  /** Strong fill for the recommended center zone. */
  recommendedFill: string;
  /** Optional border/highlight around the recommended zone. */
  recommendedBorder: string;
  /** Muted fill for below / above context zones. */
  outerFill: string;
  /** Slightly softer outer fill for the above-typical side. */
  outerFillSoft: string;
  /** Pattern status text — In range (within_recommended). */
  statusRecommendedText: string;
  /** Pattern status text — Below Typical. */
  statusBelowTypicalText: string;
  /** Pattern status text — Above Typical (neutral context, not failure). */
  statusAboveTypicalText: string;
};

export const RECOMMENDED_RANGE_CHROME_DARK: RecommendedRangeChrome = {
  recommendedFill: "rgba(52, 211, 153, 0.72)",
  recommendedBorder: "rgba(110, 231, 183, 0.95)",
  outerFill: "rgba(148, 163, 184, 0.34)",
  outerFillSoft: "rgba(148, 163, 184, 0.26)",
  statusRecommendedText: DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
  statusBelowTypicalText: DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
  statusAboveTypicalText: OLI_DARK.textSecondary,
};

export const RECOMMENDED_RANGE_CHROME_LIGHT: RecommendedRangeChrome = {
  recommendedFill: "rgba(22, 163, 74, 0.55)",
  recommendedBorder: "rgba(21, 128, 61, 0.85)",
  outerFill: "rgba(100, 116, 139, 0.28)",
  outerFillSoft: "rgba(100, 116, 139, 0.2)",
  statusRecommendedText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.positive.foreground,
  statusBelowTypicalText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.caution.foreground,
  statusAboveTypicalText: OLI_LIGHT.textSecondary,
};

/** Defaults to dark (metric detail sheets use elevated dark surfaces today). */
export function resolveRecommendedRangeChrome(
  mode: OliThemeMode = "dark",
): RecommendedRangeChrome {
  return mode === "light" ? RECOMMENDED_RANGE_CHROME_LIGHT : RECOMMENDED_RANGE_CHROME_DARK;
}

/**
 * Text color for Your Pattern status labels.
 * Maps presentation labels only — does not classify durations.
 */
export function sleepDurationReferenceStatusTextColor(
  label: SleepDurationPatternStatusLabel,
  mode: OliThemeMode = "dark",
): string {
  const chrome = resolveRecommendedRangeChrome(mode);
  if (label === "In range") return chrome.statusRecommendedText;
  if (label === "Below Typical") return chrome.statusBelowTypicalText;
  return chrome.statusAboveTypicalText;
}

/** Active dark recommended-range fill token for Duration / metric reference bars. */
export const UI_RECOMMENDED_RANGE_FILL = RECOMMENDED_RANGE_CHROME_DARK.recommendedFill;
export const UI_RECOMMENDED_RANGE_BORDER = RECOMMENDED_RANGE_CHROME_DARK.recommendedBorder;
export const UI_REFERENCE_ZONE_NEUTRAL_FILL = RECOMMENDED_RANGE_CHROME_DARK.outerFill;
export const UI_REFERENCE_ZONE_NEUTRAL_FILL_SOFT = RECOMMENDED_RANGE_CHROME_DARK.outerFillSoft;

export const UI_DURATION_STATUS_RECOMMENDED_TEXT =
  RECOMMENDED_RANGE_CHROME_DARK.statusRecommendedText;
export const UI_DURATION_STATUS_BELOW_TYPICAL_TEXT =
  RECOMMENDED_RANGE_CHROME_DARK.statusBelowTypicalText;
export const UI_DURATION_STATUS_ABOVE_TYPICAL_TEXT =
  RECOMMENDED_RANGE_CHROME_DARK.statusAboveTypicalText;
