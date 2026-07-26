/**
 * Semantic chrome for Deep / REM educational adult-context zones.
 *
 * Green = broadly typical adult context (not medically optimal).
 * Amber = below typical context (caution, not alarm).
 * Cool blue = above typical context (neutral, not better).
 * Written labels remain the primary signal.
 */

import type { SleepStageAdultContextStatus } from "@/lib/data/sleep/sleepStageAdultContext";
import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import {
  DASH_MONITOR_RATING_TONE_CHROME_DARK,
  DASH_MONITOR_RATING_TONE_CHROME_LIGHT,
} from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";
import {
  RECOMMENDED_RANGE_CHROME_DARK,
  RECOMMENDED_RANGE_CHROME_LIGHT,
} from "@/lib/ui/theme/recommendedRangeChrome";

export type SleepStageAdultContextChrome = {
  typicalFill: string;
  typicalBorder: string;
  belowFill: string;
  aboveFill: string;
  statusWithinText: string;
  statusBelowText: string;
  statusAboveText: string;
};

export const SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK: SleepStageAdultContextChrome = {
  typicalFill: RECOMMENDED_RANGE_CHROME_DARK.recommendedFill,
  typicalBorder: RECOMMENDED_RANGE_CHROME_DARK.recommendedBorder,
  belowFill: "rgba(255, 210, 115, 0.34)",
  aboveFill: "rgba(96, 165, 250, 0.32)",
  statusWithinText: DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
  statusBelowText: DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
  statusAboveText: OLI_DARK.textSlateCool,
};

export const SLEEP_STAGE_ADULT_CONTEXT_CHROME_LIGHT: SleepStageAdultContextChrome = {
  typicalFill: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedFill,
  typicalBorder: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedBorder,
  belowFill: "rgba(217, 119, 6, 0.28)",
  aboveFill: "rgba(37, 99, 235, 0.22)",
  statusWithinText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.positive.foreground,
  statusBelowText: DASH_MONITOR_RATING_TONE_CHROME_LIGHT.caution.foreground,
  statusAboveText: OLI_LIGHT.textSlateCool,
};

export function resolveSleepStageAdultContextChrome(
  mode: OliThemeMode = "dark",
): SleepStageAdultContextChrome {
  return mode === "light"
    ? SLEEP_STAGE_ADULT_CONTEXT_CHROME_LIGHT
    : SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK;
}

export function sleepStageAdultContextStatusTextColor(
  status: SleepStageAdultContextStatus,
  mode: OliThemeMode = "dark",
): string {
  const chrome = resolveSleepStageAdultContextChrome(mode);
  if (status === "within_typical") return chrome.statusWithinText;
  if (status === "below_typical") return chrome.statusBelowText;
  if (status === "above_typical") return chrome.statusAboveText;
  const _exhaustive: never = status;
  return _exhaustive;
}

/** Active dark tokens for stage adult-context bars. */
export const UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.typicalFill;
export const UI_STAGE_ADULT_CONTEXT_TYPICAL_BORDER =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.typicalBorder;
export const UI_STAGE_ADULT_CONTEXT_BELOW_FILL =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.belowFill;
export const UI_STAGE_ADULT_CONTEXT_ABOVE_FILL =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.aboveFill;
export const UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.statusWithinText;
export const UI_STAGE_ADULT_CONTEXT_BELOW_TEXT =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.statusBelowText;
export const UI_STAGE_ADULT_CONTEXT_ABOVE_TEXT =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.statusAboveText;
