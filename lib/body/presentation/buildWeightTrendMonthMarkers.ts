/**
 * Pure presentational month-letter markers for Weight trend X-axis.
 * Positions follow the plotted time domain so labels align with the series.
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
  /** Chart X from the same time scale as the plotted series. */
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
 * Place month letters on the chart time scale (same X mapping as the series).
 * Thins only when letters would collide; never invents even decorative spacing.
 */
export function placeWeightTrendMonthMarkersOnDomain(args: {
  readonly markers: readonly WeightTrendMonthMarker[];
  readonly toChartX: (timeMs: number) => number;
  readonly minGapPx?: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  const minGapPx = args.minGapPx ?? 12;
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

/**
 * Range-gated month markers aligned to the plotted time domain.
 * Returns [] for 3Y / 5Y / All.
 */
export function resolveWeightTrendMonthMarkersForRange(args: {
  readonly range: WeightRangeKey;
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
  readonly toChartX: (timeMs: number) => number;
  readonly minGapPx?: number;
}): readonly WeightTrendMonthMarkerPlaced[] {
  if (!WEIGHT_TREND_MONTH_LABEL_RANGES.has(args.range)) {
    return [];
  }
  const markers = buildWeightTrendMonthMarkers({
    minTimeMs: args.minTimeMs,
    maxTimeMs: args.maxTimeMs,
  });
  return placeWeightTrendMonthMarkersOnDomain({
    markers,
    toChartX: args.toChartX,
    ...(args.minGapPx != null ? { minGapPx: args.minGapPx } : {}),
  });
}
