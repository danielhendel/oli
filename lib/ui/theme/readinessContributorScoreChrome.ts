/**
 * Semantic chrome for readiness contributor provider-score bar + pattern labels (Phase 2F-C2).
 * Color is supplementary — written Oura rating labels remain primary.
 * Reuses Daily Monitor rating tone tokens.
 */

import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import {
  DASH_MONITOR_RATING_TONE_CHROME_DARK,
  DASH_MONITOR_RATING_TONE_CHROME_LIGHT,
} from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";

export type ReadinessContributorScoreBarChrome = {
  payAttentionFill: string;
  fairFill: string;
  goodFill: string;
  optimalFill: string;
  optimalBorder: string;
};

export const READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK: ReadinessContributorScoreBarChrome = {
  payAttentionFill: "rgba(255, 110, 118, 0.28)",
  fairFill: "rgba(255, 210, 115, 0.28)",
  goodFill: "rgba(82, 235, 145, 0.28)",
  optimalFill: "rgba(58, 91, 219, 0.32)",
  optimalBorder: "rgba(115, 165, 255, 0.52)",
};

export const READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_LIGHT: ReadinessContributorScoreBarChrome = {
  payAttentionFill: "rgba(198, 40, 40, 0.16)",
  fairFill: "rgba(255, 179, 0, 0.18)",
  goodFill: "rgba(46, 160, 90, 0.16)",
  optimalFill: "rgba(58, 91, 219, 0.14)",
  optimalBorder: "rgba(58, 91, 219, 0.36)",
};

export function resolveReadinessContributorScoreBarChrome(
  mode: OliThemeMode = "dark",
): ReadinessContributorScoreBarChrome {
  return mode === "light"
    ? READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_LIGHT
    : READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK;
}

export function readinessContributorPatternStatusTextColor(
  label: OuraRatingLabel,
  mode: OliThemeMode = "dark",
): string {
  const chrome =
    mode === "light"
      ? DASH_MONITOR_RATING_TONE_CHROME_LIGHT
      : DASH_MONITOR_RATING_TONE_CHROME_DARK;
  switch (label) {
    case "Pay attention":
      return chrome.critical.foreground;
    case "Fair":
      return chrome.caution.foreground;
    case "Good":
      return chrome.positive.foreground;
    case "Optimal":
      return chrome.optimal.foreground;
    default: {
      const _x: never = label;
      return _x;
    }
  }
}

export const UI_READINESS_SCORE_PAY_ATTENTION_FILL =
  READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK.payAttentionFill;
export const UI_READINESS_SCORE_FAIR_FILL =
  READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK.fairFill;
export const UI_READINESS_SCORE_GOOD_FILL =
  READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK.goodFill;
export const UI_READINESS_SCORE_OPTIMAL_FILL =
  READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK.optimalFill;
export const UI_READINESS_SCORE_OPTIMAL_BORDER =
  READINESS_CONTRIBUTOR_SCORE_BAR_CHROME_DARK.optimalBorder;
