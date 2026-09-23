/**
 * Complete-duration coverage for Weight selected-period Change.
 *
 * Finite ranges (7D…5Y): Change requires a baseline observation at or before
 * the requested start — never last−first of partial in-window data alone.
 * All: earliest→latest when ≥2 valid observations (no theoretical duration).
 *
 * Pure — no React / network.
 */
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import type { WeightRangeKey } from "@/lib/data/body/bodyHistoryRange";

export type WeightRangeCoverage =
  | {
      readonly status: "complete";
      readonly requestedStart: string | null;
      readonly requestedEnd: string;
      readonly baselinePoint: WeightPoint;
      readonly latestPoint: WeightPoint;
      readonly deltaKg: number;
    }
  | {
      readonly status: "partial";
      readonly requestedStart: string | null;
      readonly requestedEnd: string;
      readonly firstObservedAt: string | null;
      readonly lastObservedAt: string | null;
    };

/**
 * Latest valid observation with dayKey ≤ requestedStart (at-or-before baseline).
 * Never fabricates or interpolates a Weight value.
 */
export function selectWeightBaselineAtOrBeforeStart(
  allValidAscending: readonly WeightPoint[],
  requestedStart: string,
): WeightPoint | null {
  let baseline: WeightPoint | null = null;
  for (const p of allValidAscending) {
    if (p.dayKey <= requestedStart) {
      baseline = p;
    }
  }
  return baseline;
}

/**
 * Resolve whether Change may be shown for the selected duration.
 *
 * @param plottedPoints — observations inside the requested window (chart series)
 * @param allValidPoints — full ascending valid series (may equal plotted when fetch is windowed)
 */
export function resolveWeightRangeCoverage(args: {
  readonly selectedRange: WeightRangeKey;
  readonly requestedStart: string | null;
  readonly requestedEnd: string;
  readonly plottedPoints: readonly WeightPoint[];
  readonly allValidPoints: readonly WeightPoint[];
}): WeightRangeCoverage {
  const { selectedRange, requestedStart, requestedEnd, plottedPoints, allValidPoints } =
    args;

  const firstPlotted = plottedPoints[0] ?? null;
  const lastPlotted = plottedPoints.length > 0 ? plottedPoints[plottedPoints.length - 1]! : null;

  if (selectedRange === "All") {
    if (plottedPoints.length < 2 || firstPlotted == null || lastPlotted == null) {
      return {
        status: "partial",
        requestedStart: null,
        requestedEnd,
        firstObservedAt: firstPlotted?.observedAt ?? null,
        lastObservedAt: lastPlotted?.observedAt ?? null,
      };
    }
    return {
      status: "complete",
      requestedStart: null,
      requestedEnd,
      baselinePoint: firstPlotted,
      latestPoint: lastPlotted,
      deltaKg: lastPlotted.weightKg - firstPlotted.weightKg,
    };
  }

  if (requestedStart == null || lastPlotted == null) {
    return {
      status: "partial",
      requestedStart,
      requestedEnd,
      firstObservedAt: firstPlotted?.observedAt ?? null,
      lastObservedAt: lastPlotted?.observedAt ?? null,
    };
  }

  const baseline = selectWeightBaselineAtOrBeforeStart(allValidPoints, requestedStart);
  if (baseline == null) {
    return {
      status: "partial",
      requestedStart,
      requestedEnd,
      firstObservedAt: firstPlotted?.observedAt ?? null,
      lastObservedAt: lastPlotted.observedAt,
    };
  }

  return {
    status: "complete",
    requestedStart,
    requestedEnd,
    baselinePoint: baseline,
    latestPoint: lastPlotted,
    deltaKg: lastPlotted.weightKg - baseline.weightKg,
  };
}
