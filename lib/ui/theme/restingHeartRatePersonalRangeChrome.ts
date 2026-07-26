/**
 * Semantic chrome for Resting Heart Rate personal usual-range bar (Phase 2F-B).
 * Reuses Duration recommended-range green/teal + muted outer zones.
 * Written labels remain primary; color is supplementary.
 * No red for a single nightly result.
 */

import type { RestingHeartRatePatternStatusLabel } from "@/lib/data/readiness/restingHeartRatePersonalRange";
import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import {
  DASH_MONITOR_RATING_TONE_CHROME_DARK,
  DASH_MONITOR_RATING_TONE_CHROME_LIGHT,
} from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import {
  RECOMMENDED_RANGE_CHROME_DARK,
  RECOMMENDED_RANGE_CHROME_LIGHT,
} from "@/lib/ui/theme/recommendedRangeChrome";
import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";

export type RestingHeartRatePersonalRangeChrome = {
  usualFill: string;
  usualBorder: string;
  belowFill: string;
  aboveFill: string;
  statusInUsualText: string;
  statusBelowUsualText: string;
  statusAboveUsualText: string;
};

export const RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_DARK: RestingHeartRatePersonalRangeChrome =
  {
    usualFill: RECOMMENDED_RANGE_CHROME_DARK.recommendedFill,
    usualBorder: RECOMMENDED_RANGE_CHROME_DARK.recommendedBorder,
    belowFill: RECOMMENDED_RANGE_CHROME_DARK.outerFill,
    aboveFill: RECOMMENDED_RANGE_CHROME_DARK.outerFillSoft,
    statusInUsualText: DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
    statusBelowUsualText: DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
    statusAboveUsualText: OLI_DARK.textSecondary,
  };

export const RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_LIGHT: RestingHeartRatePersonalRangeChrome =
  {
    usualFill: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedFill,
    usualBorder: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedBorder,
    belowFill: RECOMMENDED_RANGE_CHROME_LIGHT.outerFill,
    aboveFill: RECOMMENDED_RANGE_CHROME_LIGHT.outerFillSoft,
    statusInUsualText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.positive.foreground,
    statusBelowUsualText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.caution.foreground,
    statusAboveUsualText: OLI_LIGHT.textSecondary,
  };

export function resolveRestingHeartRatePersonalRangeChrome(
  mode: OliThemeMode = "dark",
): RestingHeartRatePersonalRangeChrome {
  return mode === "light"
    ? RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_LIGHT
    : RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_DARK;
}

export function restingHeartRatePatternStatusTextColor(
  label: RestingHeartRatePatternStatusLabel,
  mode: OliThemeMode = "dark",
): string {
  const chrome = resolveRestingHeartRatePersonalRangeChrome(mode);
  if (label === "In usual range") return chrome.statusInUsualText;
  if (label === "Below usual range") return chrome.statusBelowUsualText;
  return chrome.statusAboveUsualText;
}

export const UI_RHR_USUAL_RANGE_FILL =
  RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_DARK.usualFill;
export const UI_RHR_USUAL_RANGE_BORDER =
  RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_DARK.usualBorder;
export const UI_RHR_BELOW_USUAL_FILL =
  RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_DARK.belowFill;
export const UI_RHR_ABOVE_USUAL_FILL =
  RESTING_HEART_RATE_PERSONAL_RANGE_CHROME_DARK.aboveFill;
