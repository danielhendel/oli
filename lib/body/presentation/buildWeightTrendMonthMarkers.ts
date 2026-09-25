/**
 * Pure presentational month-letter markers for Weight trend X-axis.
 * Positions follow the plotted time domain (month starts) — same scale as the series.
 */

import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import {
  mapWeightTrendTimeToX,
  type WeightTrendTimeScale,
} from "@/lib/body/presentation/weightTrendTimeScale";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

/** Ranges that show month letters (≤ 1Y). Long ranges omit them to avoid clutter. */
export const WEIGHT_TREND_MONTH_LABEL_RANGES: ReadonlySet<WeightRangeKey> = new Set([
  "7D",
  "30D",
  "90D",
  "6M",
  "1Y",
]);

export type WeightTrendMonthMarker = {
  /** Stable key `YYYY-MM`. */
  readonly key: string;
  /** Single-letter month label (J…D). */
  readonly letter: (typeof MONTH_LETTERS)[number];
  /**
   * Timestamp for placement: calendar month start (UTC noon), clamped into the
   * visible domain for a partial leading month. Never mid-month decorative fudge.
   */
  readonly timeMs: number;
};

export type WeightTrendMonthMarkerPlaced = WeightTrendMonthMarker & {
  /** Chart X from the shared timestamp scale. */
  readonly x: number;
};

/**
 * Build chronological month letters for every calendar month intersecting the domain.
 * Each marker anchors at the month start (or domain start for a partial first month).
 */
export function buildWeightTrendMonthMarkers(args: {
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
}): readonly WeightTrendMonthMarker[] {
  const { minTimeMs, maxTimeMs } = args;
  if (
    !Number.isFinite(minTimeMs) ||
    !Number.isFinite(maxTimeMs) ||
    maxTimeMs < minTimeMs
  ) {
    return [];
  }

  const start = new Date(minTimeMs);
  const end = new Date(maxTimeMs);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  const markers: WeightTrendMonthMarker[] = [];

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const monthStartMs = Date.UTC(year, month, 1, 12, 0, 0);
    const nextMonthStartMs = Date.UTC(year, month + 1, 1, 12, 0, 0);
    const monthEndMs = nextMonthStartMs - 1;

    if (monthEndMs >= minTimeMs && monthStartMs <= maxTimeMs) {
      // Anchor at month start; clamp into domain so partial months stay truthful.
      const timeMs = Math.min(Math.max(monthStartMs, minTimeMs), maxTimeMs);

      markers.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        letter: MONTH_LETTERS[month]!,
        timeMs,
      });
    }

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return markers;
}

/**
 * Place month letters via the shared timestamp scale.
 * On collision, drop later labels — never shift away from true time.
 */
export function placeWeightTrendMonthMarkersOnDomain(args: {
  readonly markers: readonly WeightTrendMonthMarker[];
  readonly scale: WeightTrendTimeScale;
  readonly minGapPx?: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  const minGapPx = args.minGapPx ?? 12;
  const placed: WeightTrendMonthMarkerPlaced[] = [];
  let lastX = Number.NEGATIVE_INFINITY;

  for (const marker of args.markers) {
    const x = mapWeightTrendTimeToX(marker.timeMs, args.scale);
    if (!Number.isFinite(x)) continue;
    if (placed.length === 0 || x - lastX >= minGapPx) {
      placed.push({ ...marker, x });
      lastX = x;
    }
  }

  return placed;
}

/**
 * Range-gated month markers on the shared Weight trend time scale.
 * Returns [] for 3Y / 5Y / All.
 */
export function resolveWeightTrendMonthMarkersForRange(args: {
  readonly range: WeightRangeKey;
  readonly scale: WeightTrendTimeScale;
  readonly minGapPx?: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  if (!WEIGHT_TREND_MONTH_LABEL_RANGES.has(args.range)) {
    return [];
  }
  const markers = buildWeightTrendMonthMarkers({
    minTimeMs: args.scale.domainStartMs,
    maxTimeMs: args.scale.domainEndMs,
  });
  return placeWeightTrendMonthMarkersOnDomain({
    markers,
    scale: args.scale,
    ...(args.minGapPx != null ? { minGapPx: args.minGapPx } : {}),
  });
}
