/**
 * Semantic chrome for Sleep Efficiency two-zone guideline bar.
 * Reuses Duration / stage recommended-range green + amber caution text.
 * No red. No blue higher tier. No Above Guideline zone.
 */

import type {
  SleepEfficiencyGuidelineStatus,
  SleepEfficiencyPatternStatusLabel,
} from "@/lib/data/sleep/sleepEfficiencyGuideline";
import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import {
  DASH_MONITOR_RATING_TONE_CHROME_DARK,
  DASH_MONITOR_RATING_TONE_CHROME_LIGHT,
} from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import {
  RECOMMENDED_RANGE_CHROME_DARK,
  RECOMMENDED_RANGE_CHROME_LIGHT,
} from "@/lib/ui/theme/recommendedRangeChrome";

export type SleepEfficiencyGuidelineChrome = {
  meetsFill: string;
  meetsBorder: string;
  belowFill: string;
  statusMeetsText: string;
  statusBelowText: string;
};

export const SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK: SleepEfficiencyGuidelineChrome = {
  meetsFill: RECOMMENDED_RANGE_CHROME_DARK.recommendedFill,
  meetsBorder: RECOMMENDED_RANGE_CHROME_DARK.recommendedBorder,
  belowFill: RECOMMENDED_RANGE_CHROME_DARK.outerFill,
  statusMeetsText: DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
  statusBelowText: DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
};

export const SLEEP_EFFICIENCY_GUIDELINE_CHROME_LIGHT: SleepEfficiencyGuidelineChrome = {
  meetsFill: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedFill,
  meetsBorder: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedBorder,
  belowFill: RECOMMENDED_RANGE_CHROME_LIGHT.outerFill,
  statusMeetsText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.positive.foreground,
  statusBelowText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.caution.foreground,
};

export function resolveSleepEfficiencyGuidelineChrome(
  mode: OliThemeMode = "dark",
): SleepEfficiencyGuidelineChrome {
  return mode === "light"
    ? SLEEP_EFFICIENCY_GUIDELINE_CHROME_LIGHT
    : SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK;
}

export function sleepEfficiencyGuidelineStatusTextColor(
  status: SleepEfficiencyGuidelineStatus,
  mode: OliThemeMode = "dark",
): string {
  const chrome = resolveSleepEfficiencyGuidelineChrome(mode);
  if (status === "meets_guideline") return chrome.statusMeetsText;
  if (status === "below_guideline") return chrome.statusBelowText;
  const _exhaustive: never = status;
  return _exhaustive;
}

export function sleepEfficiencyPatternStatusTextColor(
  label: SleepEfficiencyPatternStatusLabel,
  mode: OliThemeMode = "dark",
): string {
  const chrome = resolveSleepEfficiencyGuidelineChrome(mode);
  if (label === "Meets guideline") return chrome.statusMeetsText;
  if (label === "Below guideline") return chrome.statusBelowText;
  const _exhaustive: never = label;
  return _exhaustive;
}

export const UI_SLEEP_EFFICIENCY_MEETS_FILL =
  SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK.meetsFill;
export const UI_SLEEP_EFFICIENCY_MEETS_BORDER =
  SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK.meetsBorder;
export const UI_SLEEP_EFFICIENCY_BELOW_FILL =
  SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK.belowFill;
export const UI_SLEEP_EFFICIENCY_MEETS_TEXT =
  SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK.statusMeetsText;
export const UI_SLEEP_EFFICIENCY_BELOW_TEXT =
  SLEEP_EFFICIENCY_GUIDELINE_CHROME_DARK.statusBelowText;
