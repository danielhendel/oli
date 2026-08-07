/**
 * Y/X domain for lab trend charts — observed values only, no clinical floors.
 */

import type { LabChartDomain, LabTrendPoint } from "./labTrendTypes";

const DEFAULT_PAD_RATIO = 0.12;
/** Minimum absolute pad when values nearly equal but not identical. */
const MIN_ABS_PAD = 0.5;

export function buildLabChartDomain(
  points: readonly LabTrendPoint[],
  opts?: { padRatio?: number },
): LabChartDomain | null {
  const usable = points.filter(
    (p) => p.epochMs != null && Number.isFinite(p.epochMs) && Number.isFinite(p.value),
  );
  if (usable.length === 0) return null;

  const xs = usable.map((p) => p.epochMs!);
  const ys = usable.map((p) => p.value);
  const xMinMs = Math.min(...xs);
  const xMaxMs = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  const flat = yMax === yMin;

  if (flat) {
    // Flat line: keep a readable band without fabricating a trend.
    const pad = Math.max(Math.abs(yMin) * 0.05, MIN_ABS_PAD);
    return {
      xMinMs,
      xMaxMs: xMaxMs === xMinMs ? xMinMs + 1 : xMaxMs,
      yMin: yMin - pad,
      yMax: yMax + pad,
      flat: true,
    };
  }

  const padRatio = opts?.padRatio ?? DEFAULT_PAD_RATIO;
  const span = yMax - yMin;
  const pad = Math.max(span * padRatio, MIN_ABS_PAD);
  yMin -= pad;
  yMax += pad;

  return {
    xMinMs,
    xMaxMs: xMaxMs === xMinMs ? xMinMs + 1 : xMaxMs,
    yMin,
    yMax,
    flat: false,
  };
}
