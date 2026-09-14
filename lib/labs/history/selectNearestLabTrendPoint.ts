/**
 * Nearest real lab trend point for scrub interaction — no interpolated values.
 */

import type { LabTrendPoint } from "./labTrendTypes";

export function selectNearestLabTrendPoint(args: {
  points: readonly LabTrendPoint[];
  /** Touch x mapped into the same epochMs space as points. */
  targetEpochMs: number;
}): LabTrendPoint | null {
  const usable = args.points.filter((p) => p.epochMs != null && Number.isFinite(p.epochMs));
  if (usable.length === 0) return null;
  if (!Number.isFinite(args.targetEpochMs)) return null;

  let best = usable[0]!;
  let bestDist = Math.abs(best.epochMs! - args.targetEpochMs);
  for (let i = 1; i < usable.length; i++) {
    const p = usable[i]!;
    const d = Math.abs(p.epochMs! - args.targetEpochMs);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

/** Map a chart-local x pixel into epochMs using the domain. */
export function mapChartXToEpochMs(args: {
  locationX: number;
  plotLeft: number;
  plotWidth: number;
  xMinMs: number;
  xMaxMs: number;
}): number | null {
  if (!(args.plotWidth > 0)) return null;
  const t = (args.locationX - args.plotLeft) / args.plotWidth;
  const clamped = Math.min(1, Math.max(0, t));
  return args.xMinMs + clamped * (args.xMaxMs - args.xMinMs);
}
