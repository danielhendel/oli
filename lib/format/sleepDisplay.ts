/**
 * Presentation helpers for DailyFacts-backed sleep (minutes and ratios).
 */

import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";

/** Shown under the headline when a vendor sleep score is displayed (Phase 1: Oura snapshot). */
export const SLEEP_HEADLINE_FOOTNOTE_VENDOR =
  "Sleep score from your device snapshot (Oura) — same value we store from the vendor.";

/** Headline only: no vendor sleep score for this day (Oli metrics below are unchanged). */
export const SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE =
  "No sleep score from your device snapshot for this day. Try syncing or choose another day.";

/** Efficiency stored in DailyFacts as aggregate mean of canonical episodes (0–1). */
export function formatEfficiencyRatio(ratio: number | undefined): string {
  if (ratio == null || typeof ratio !== "number" || !Number.isFinite(ratio)) return "—";
  const pct = ratio <= 1 ? Math.round(ratio * 100) : Math.round(ratio);
  return `${pct}%`;
}

export function formatMinutesValue(minutes: number | undefined): string {
  return formatSleepDurationMinutes(minutes);
}
