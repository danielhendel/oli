/**
 * Selected-range coverage / Change for Weight trend.
 *
 * Product rule (Stage 3C): Change = last plotted − first plotted whenever the
 * selected series has ≥2 valid observations. The coverage footer already shows
 * the true observed window — no full-duration gate.
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
 * Retained for diagnostics / callers that need theoretical-window baselines.
 * Weight Change presentation no longer requires this for the Change card.
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
 * Resolve Change for the selected plotted series.
 *
 * complete: ≥2 plotted points → delta = last − first (actual plotted endpoints)
 * partial: fewer than 2 plotted points → Change unavailable
 */
export function resolveWeightRangeCoverage(args: {
  readonly selectedRange: WeightRangeKey;
  readonly requestedStart: string | null;
  readonly requestedEnd: string;
  readonly plottedPoints: readonly WeightPoint[];
  /** Unused for Change math — kept for call-site compatibility. */
  readonly allValidPoints: readonly WeightPoint[];
}): WeightRangeCoverage {
  void args.allValidPoints;
  void args.selectedRange;

  const { requestedStart, requestedEnd, plottedPoints } = args;
  const firstPlotted = plottedPoints[0] ?? null;
  const lastPlotted =
    plottedPoints.length > 0 ? plottedPoints[plottedPoints.length - 1]! : null;

  if (plottedPoints.length < 2 || firstPlotted == null || lastPlotted == null) {
    return {
      status: "partial",
      requestedStart,
      requestedEnd,
      firstObservedAt: firstPlotted?.observedAt ?? null,
      lastObservedAt: lastPlotted?.observedAt ?? null,
    };
  }

  return {
    status: "complete",
    requestedStart,
    requestedEnd,
    baselinePoint: firstPlotted,
    latestPoint: lastPlotted,
    deltaKg: lastPlotted.weightKg - firstPlotted.weightKg,
  };
}
