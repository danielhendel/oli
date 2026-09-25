/**
 * Pure presentational month-letter markers for Weight trend X-axis.
 * Derived from the plotted time domain — not a second date truth.
 */

import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

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
  /** Representative time within the month slice (domain identity). */
  readonly timeMs: number;
};

export type WeightTrendMonthMarkerPlaced = WeightTrendMonthMarker & {
  /** Evenly spaced chart X — decoration rhythm, not raw density. */
  readonly x: number;
};

/**
 * Build chronological month letters for every calendar month intersecting the domain.
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
      const sliceStart = Math.max(minTimeMs, monthStartMs);
      const sliceEnd = Math.min(maxTimeMs, monthEndMs);
      const midMonthMs = Date.UTC(year, month, 15, 12, 0, 0);
      const timeMs =
        midMonthMs >= sliceStart && midMonthMs <= sliceEnd
          ? midMonthMs
          : (sliceStart + sliceEnd) / 2;

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
 * Place month letters with even horizontal rhythm across the plot width.
 * Letter sequence still follows chronological month progression in the domain.
 */
export function placeWeightTrendMonthMarkersEvenly(args: {
  readonly markers: readonly WeightTrendMonthMarker[];
  readonly plotLeft: number;
  readonly plotWidth: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  const { markers, plotLeft, plotWidth } = args;
  if (markers.length === 0 || !(plotWidth > 0)) return [];

  const n = markers.length;
  return markers.map((marker, i) => ({
    ...marker,
    x: plotLeft + ((i + 0.5) / n) * plotWidth,
  }));
}

/**
 * Range-gated, evenly spaced month markers for the Weight trend chart.
 * Returns [] for 3Y / 5Y / All (and unknown long ranges).
 */
export function resolveWeightTrendMonthMarkersForRange(args: {
  readonly range: WeightRangeKey;
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
  readonly plotLeft: number;
  readonly plotWidth: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  if (!WEIGHT_TREND_MONTH_LABEL_RANGES.has(args.range)) {
    return [];
  }
  const markers = buildWeightTrendMonthMarkers({
    minTimeMs: args.minTimeMs,
    maxTimeMs: args.maxTimeMs,
  });
  return placeWeightTrendMonthMarkersEvenly({
    markers,
    plotLeft: args.plotLeft,
    plotWidth: args.plotWidth,
  });
}

/**
 * @deprecated Prefer {@link placeWeightTrendMonthMarkersEvenly} / range-gated resolver.
 * Kept for any residual callers; thins by domain X rather than even spacing.
 */
export function thinWeightTrendMonthMarkersForPlot(args: {
  readonly markers: readonly WeightTrendMonthMarker[];
  readonly toChartX: (timeMs: number) => number;
  readonly minGapPx?: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  const minGapPx = args.minGapPx ?? 14;
  const placed: WeightTrendMonthMarkerPlaced[] = [];
  let lastX = Number.NEGATIVE_INFINITY;

  for (const marker of args.markers) {
    const x = args.toChartX(marker.timeMs);
    if (!Number.isFinite(x)) continue;
    if (placed.length === 0 || x - lastX >= minGapPx) {
      placed.push({ ...marker, x });
      lastX = x;
    }
  }

  return placed;
}
