/**
 * Pure presentational month-letter markers for Weight trend X-axis.
 * Derived from the same plotted time domain the chart already uses — not a second date truth.
 */

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

export type WeightTrendMonthMarker = {
  /** Stable key `YYYY-MM`. */
  readonly key: string;
  /** Single-letter month label (J…D). */
  readonly letter: (typeof MONTH_LETTERS)[number];
  /** Milliseconds on the chart time domain for horizontal placement. */
  readonly timeMs: number;
};

/**
 * Build month letters for every calendar month intersecting `[minTimeMs, maxTimeMs]`.
 * Anchors each letter near mid-month when that falls inside the domain; otherwise
 * at the midpoint of the visible slice of that month.
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
 * Drop markers that would collide horizontally; always keep first when any exist.
 */
export function thinWeightTrendMonthMarkersForPlot(args: {
  readonly markers: readonly WeightTrendMonthMarker[];
  readonly toChartX: (timeMs: number) => number;
  readonly minGapPx?: number;
}): readonly (WeightTrendMonthMarker & { readonly x: number })[] {
  const minGapPx = args.minGapPx ?? 14;
  const placed: (WeightTrendMonthMarker & { readonly x: number })[] = [];
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
