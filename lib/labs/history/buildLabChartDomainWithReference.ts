/**
 * Chart domain including observed values and displayed source-reference thresholds.
 * Pure — no clinical floors, no forced zero baseline.
 */

import { buildLabChartDomain } from "./buildLabChartDomain";
import { labReferenceOverlayThresholds } from "./buildLabReferenceOverlay";
import type { LabChartReferenceOverlay } from "./labReferenceOverlayTypes";
import type { LabChartDomain, LabTrendPoint } from "./labTrendTypes";

const DEFAULT_PAD_RATIO = 0.12;
const MIN_ABS_PAD = 0.5;

/**
 * Extend y-domain so source-reference boundaries remain visible with modest padding.
 * Falls back to observed-only domain when overlay has no numeric thresholds.
 */
export function buildLabChartDomainWithReference(
  points: readonly LabTrendPoint[],
  overlay: LabChartReferenceOverlay | null | undefined,
  opts?: { padRatio?: number },
): LabChartDomain | null {
  const base = buildLabChartDomain(points, opts);
  if (!base) return null;

  const thresholds = overlay ? labReferenceOverlayThresholds(overlay) : [];
  const usableThresholds = thresholds.filter((t) => Number.isFinite(t));
  if (usableThresholds.length === 0) return base;

  const usable = points.filter(
    (p) => p.epochMs != null && Number.isFinite(p.epochMs) && Number.isFinite(p.value),
  );
  if (usable.length === 0) return base;

  const ys = usable.map((p) => p.value);
  const yMin = Math.min(...ys, ...usableThresholds);
  const yMax = Math.max(...ys, ...usableThresholds);
  const flatObserved = Math.min(...ys) === Math.max(...ys);
  const padRatio = opts?.padRatio ?? DEFAULT_PAD_RATIO;
  const span = yMax - yMin;
  const pad = Math.max(span * padRatio, MIN_ABS_PAD);

  // Flat observed series still needs readable padding after thresholds expand span.
  if (span === 0 || (flatObserved && usableThresholds.every((t) => t === ys[0]))) {
    const flatPad = Math.max(Math.abs(yMin) * 0.05, MIN_ABS_PAD);
    return {
      ...base,
      yMin: yMin - flatPad,
      yMax: yMax + flatPad,
      flat: flatObserved,
    };
  }

  return {
    ...base,
    yMin: yMin - pad,
    yMax: yMax + pad,
    flat: false,
  };
}
