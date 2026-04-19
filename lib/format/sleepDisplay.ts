/**
 * Presentation helpers for DailyFacts-backed sleep (minutes and ratios).
 */

import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";

/** Efficiency stored in DailyFacts as aggregate mean of canonical episodes (0–1). */
export function formatEfficiencyRatio(ratio: number | undefined): string {
  if (ratio == null || typeof ratio !== "number" || !Number.isFinite(ratio)) return "—";
  const pct = ratio <= 1 ? Math.round(ratio * 100) : Math.round(ratio);
  return `${pct}%`;
}

export function formatMinutesValue(minutes: number | undefined): string {
  return formatSleepDurationMinutes(minutes);
}
