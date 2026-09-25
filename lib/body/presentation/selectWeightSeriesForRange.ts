/**
 * Single selected-period Weight series — one filter drives chart + period stats.
 * Pure — no React / network.
 */
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import type { WeightRangeKey } from "@/lib/data/body/bodyHistoryRange";
import { resolveWeightSelectedRangeWindow } from "@/lib/body/presentation/resolveWeightSelectedRangeWindow";

export type WeightSelectedSeries = {
  readonly selectedRange: WeightRangeKey;
  readonly requestedStart: string | null;
  readonly requestedEnd: string;
  /** Valid observations inside the requested window, ascending by observedAt. */
  readonly plottedPoints: readonly WeightPoint[];
  /** Full valid ascending series before window filter (for baseline selection). */
  readonly allValidPoints: readonly WeightPoint[];
};

function isValidWeightPoint(p: WeightPoint): boolean {
  return Number.isFinite(p.weightKg) && p.weightKg > 0 && typeof p.dayKey === "string" && p.dayKey.length > 0;
}

function sortByObservedAt(points: readonly WeightPoint[]): WeightPoint[] {
  return [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

/**
 * Construct exactly one selected-period series from history points.
 */
export function selectWeightSeriesForRange(
  allWeightPoints: readonly WeightPoint[],
  selectedRange: WeightRangeKey,
  opts?: { readonly anchorDayKey?: string },
): WeightSelectedSeries {
  const window = resolveWeightSelectedRangeWindow(selectedRange, opts);
  const allValidPoints = sortByObservedAt(allWeightPoints.filter(isValidWeightPoint));

  const plottedPoints =
    window.start == null
      ? allValidPoints
      : allValidPoints.filter(
          (p) => p.dayKey >= window.start! && p.dayKey <= window.end,
        );

  return {
    selectedRange,
    requestedStart: window.start,
    requestedEnd: window.end,
    plottedPoints,
    allValidPoints,
  };
}
