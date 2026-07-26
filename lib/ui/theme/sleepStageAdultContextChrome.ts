/**
 * Semantic chrome for Deep / REM educational typical-range bars.
 *
 * Visual grammar matches Duration: muted gray outer zones + strong green typical
 * center. Status text remains colored (amber / green / cool) as a supplementary
 * signal — written labels are primary. Outer bar fills are gray only (no amber/blue
 * zone fills; no red alarm for one night outside the band).
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
  /** Shared muted gray for below + above segments (Duration-like). */
  outerFill: string;
  statusWithinText: string;
  statusBelowText: string;
  statusAboveText: string;
};

export const SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK: SleepStageAdultContextChrome = {
  typicalFill: RECOMMENDED_RANGE_CHROME_DARK.recommendedFill,
  typicalBorder: RECOMMENDED_RANGE_CHROME_DARK.recommendedBorder,
  outerFill: RECOMMENDED_RANGE_CHROME_DARK.outerFill,
  statusWithinText: DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
  statusBelowText: DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
  statusAboveText: OLI_DARK.textSlateCool,
};

export const SLEEP_STAGE_ADULT_CONTEXT_CHROME_LIGHT: SleepStageAdultContextChrome = {
  typicalFill: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedFill,
  typicalBorder: RECOMMENDED_RANGE_CHROME_LIGHT.recommendedBorder,
  outerFill: RECOMMENDED_RANGE_CHROME_LIGHT.outerFill,
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

/** Active dark tokens for stage typical-range bars. */
export const UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.typicalFill;
export const UI_STAGE_ADULT_CONTEXT_TYPICAL_BORDER =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.typicalBorder;
export const UI_STAGE_ADULT_CONTEXT_OUTER_FILL =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.outerFill;
/** @deprecated Alias — below and above share the same muted gray fill. */
export const UI_STAGE_ADULT_CONTEXT_BELOW_FILL = UI_STAGE_ADULT_CONTEXT_OUTER_FILL;
/** @deprecated Alias — below and above share the same muted gray fill. */
export const UI_STAGE_ADULT_CONTEXT_ABOVE_FILL = UI_STAGE_ADULT_CONTEXT_OUTER_FILL;
export const UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.statusWithinText;
export const UI_STAGE_ADULT_CONTEXT_BELOW_TEXT =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.statusBelowText;
export const UI_STAGE_ADULT_CONTEXT_ABOVE_TEXT =
  SLEEP_STAGE_ADULT_CONTEXT_CHROME_DARK.statusAboveText;
