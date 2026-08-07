/**
 * Range filter for lab trend charts — collection date only.
 */

import type { LabTrendPoint, LabTrendRangeKey } from "@/lib/labs/history/labTrendTypes";

const MS_PER_DAY = 86_400_000;

function rangeDays(key: LabTrendRangeKey): number | null {
  if (key === "all") return null;
  if (key === "1y") return 365;
  if (key === "3y") return 365 * 3;
  if (key === "5y") return 365 * 5;
  return null;
}

/**
 * Filter points by collectedAt epoch relative to the latest point in the series.
 * Does not use upload dates. Returns ascending order unchanged when key is `all`.
 */
export function filterLabTrendRange(
  points: readonly LabTrendPoint[],
  range: LabTrendRangeKey,
): readonly LabTrendPoint[] {
  if (range === "all" || points.length === 0) return points;
  const days = rangeDays(range);
  if (days == null) return points;

  const withEpoch = points.filter((p) => p.epochMs != null);
  if (withEpoch.length === 0) return [];

  const latestMs = Math.max(...withEpoch.map((p) => p.epochMs!));
  const cutoff = latestMs - days * MS_PER_DAY;
  return points.filter((p) => p.epochMs != null && p.epochMs >= cutoff);
}
