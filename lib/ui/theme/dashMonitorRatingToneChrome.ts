/**
 * Semantic chrome for Daily Monitor Oura provider-rating badges.
 * Color is supplementary — the written rating label remains the primary signal.
 *
 * Tones: critical (red), caution (amber), positive (green), optimal (blue).
 * Optimal uses the product accent blue family — not a vendor-owned token name.
 */

import type { OliThemeMode } from "@/lib/ui/theme/oliTheme";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export type DashMonitorRatingToneChromeKey =
  | "critical"
  | "caution"
  | "positive"
  | "optimal";

export type DashMonitorRatingToneChrome = {
  foreground: string;
  background: string;
  border: string;
};

/** Dark-elevated card appearance (primary reviewed Daily Monitor surface). */
export const DASH_MONITOR_RATING_TONE_CHROME_DARK: Record<
  DashMonitorRatingToneChromeKey,
  DashMonitorRatingToneChrome
> = {
  critical: {
    foreground: "#FFB3B8",
    background: "rgba(255, 110, 118, 0.22)",
    border: "rgba(255, 110, 118, 0.48)",
  },
  caution: {
    foreground: "#FFE08A",
    background: "rgba(255, 210, 115, 0.22)",
    border: "rgba(255, 210, 115, 0.48)",
  },
  positive: {
    foreground: "#B8F7CF",
    background: "rgba(82, 235, 145, 0.22)",
    border: "rgba(82, 235, 145, 0.48)",
  },
  optimal: {
    foreground: "#C9D9FF",
    background: "rgba(58, 91, 219, 0.28)",
    border: "rgba(115, 165, 255, 0.52)",
  },
};

/** Light appearance — darker foregrounds for contrast on pale badge fills. */
export const DASH_MONITOR_RATING_TONE_CHROME_LIGHT: Record<
  DashMonitorRatingToneChromeKey,
  DashMonitorRatingToneChrome
> = {
  critical: {
    foreground: "#B71C1C",
    background: "rgba(198, 40, 40, 0.12)",
    border: "rgba(198, 40, 40, 0.36)",
  },
  caution: {
    foreground: "#9A6B00",
    background: "rgba(255, 179, 0, 0.16)",
    border: "rgba(201, 148, 0, 0.4)",
  },
  positive: {
    foreground: "#1B7A45",
    background: "rgba(46, 160, 90, 0.14)",
    border: "rgba(46, 160, 90, 0.36)",
  },
  optimal: {
    foreground: SYSTEM_ACCENT,
    background: "rgba(58, 91, 219, 0.12)",
    border: "rgba(58, 91, 219, 0.36)",
  },
};

/** Resolve badge chrome for a tone. Defaults to dark (Dash cards use dark tokens today). */
export function resolveDashMonitorRatingToneChrome(
  tone: DashMonitorRatingToneChromeKey,
  mode: OliThemeMode = "dark",
): DashMonitorRatingToneChrome {
  return mode === "light"
    ? DASH_MONITOR_RATING_TONE_CHROME_LIGHT[tone]
    : DASH_MONITOR_RATING_TONE_CHROME_DARK[tone];
}
