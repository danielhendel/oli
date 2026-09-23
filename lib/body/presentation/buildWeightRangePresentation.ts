/**
 * Atomic Weight selected-range presentation — one series drives chart, Change,
 * Average, High, Low, and observed coverage. Built outside JSX.
 *
 * Pure — no React / network.
 */
import { buildObservedDateExtent } from "@/lib/body/presentation/buildObservedDateExtent";
import type { ObservedDateExtent } from "@/lib/body/presentation/buildObservedDateExtent";
import {
  resolveWeightRangeCoverage,
  type WeightRangeCoverage,
} from "@/lib/body/presentation/resolveWeightRangeCoverage";
import { selectWeightSeriesForRange } from "@/lib/body/presentation/selectWeightSeriesForRange";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import type { WeightRangeKey } from "@/lib/data/body/bodyHistoryRange";

export type WeightRangePresentation = {
  readonly selectedRange: WeightRangeKey;
  readonly requestedWindow: {
    readonly start: string | null;
    readonly end: string;
  };
  readonly plottedPoints: readonly WeightPoint[];
  /** Point identity keys (observedAt) for the plotted series — chart ≡ stats. */
  readonly plottedPointIds: readonly string[];
  readonly observedExtent: ObservedDateExtent | null;
  readonly coverage: WeightRangeCoverage;
  readonly changeKg: number | null;
  readonly averageKg: number | null;
  readonly highKg: number | null;
  readonly lowKg: number | null;
};

function meanKg(points: readonly WeightPoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((s, p) => s + p.weightKg, 0);
  return sum / points.length;
}

/**
 * Build one complete range-specific presentation from history points.
 */
export function buildWeightRangePresentation(args: {
  readonly selectedRange: WeightRangeKey;
  readonly points: readonly WeightPoint[];
  readonly anchorDayKey?: string;
}): WeightRangePresentation {
  const series = selectWeightSeriesForRange(args.points, args.selectedRange, {
    ...(args.anchorDayKey != null ? { anchorDayKey: args.anchorDayKey } : {}),
  });

  const plotted = series.plottedPoints;
  const coverage = resolveWeightRangeCoverage({
    selectedRange: series.selectedRange,
    requestedStart: series.requestedStart,
    requestedEnd: series.requestedEnd,
    plottedPoints: plotted,
    allValidPoints: series.allValidPoints,
  });

  const values = plotted.map((p) => p.weightKg);

  return {
    selectedRange: series.selectedRange,
    requestedWindow: {
      start: series.requestedStart,
      end: series.requestedEnd,
    },
    plottedPoints: plotted,
    plottedPointIds: plotted.map((p) => p.observedAt),
    observedExtent: buildObservedDateExtent(plotted),
    coverage,
    changeKg: coverage.status === "complete" ? coverage.deltaKg : null,
    averageKg: meanKg(plotted),
    highKg: values.length > 0 ? Math.max(...values) : null,
    lowKg: values.length > 0 ? Math.min(...values) : null,
  };
}
