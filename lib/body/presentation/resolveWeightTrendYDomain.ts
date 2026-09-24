/**
 * Deterministic Y-domain for Weight (and mass) trend charts.
 * Mass display units use clean axis ticks (5 lb / 2 kg).
 * Observation-driven by default. Optional classification boundaries may gently
 * expand the domain so CDC/WHO weight bands remain readable behind the line.
 */

import { buildWeightAxisTicks } from "@/lib/body/presentation/buildWeightAxisTicks";

export type WeightTrendYDomainInput = {
  readonly valuesKg: readonly number[];
  readonly valueKind: "mass" | "generic";
  /** Display unit label — used only to pick mass span heuristics for lb vs kg. */
  readonly unitLabel: string;
  /**
   * Optional BMI→kg boundaries (typically 18.5 / 25 / 30 at height).
   * Nearby boundaries expand the observation domain so classification bands show.
   */
  readonly classificationBoundariesKg?: readonly number[];
};

export type WeightTrendYDomain = {
  readonly displayMin: number;
  readonly displayMax: number;
  readonly outlierCount: number;
};

/** Extra edge padding so generic (non-mass) lines do not kiss the plot boundary. */
const EDGE_PAD_RATIO = 0.12;
const MIN_SPAN_GENERIC = 1;
/** How far outside the observation window a boundary may pull the domain. */
const CLASSIFICATION_BOUNDARY_REACH = 0.55;

function expandDomainForClassificationBoundaries(args: {
  readonly displayMin: number;
  readonly displayMax: number;
  readonly boundariesKg: readonly number[];
}): { readonly displayMin: number; readonly displayMax: number } {
  const span = Math.max(args.displayMax - args.displayMin, 0.1);
  const reach = span * CLASSIFICATION_BOUNDARY_REACH;
  let min = args.displayMin;
  let max = args.displayMax;
  for (const b of args.boundariesKg) {
    if (!Number.isFinite(b) || b <= 0) continue;
    if (b >= args.displayMin - reach && b <= args.displayMax + reach) {
      min = Math.min(min, b);
      max = Math.max(max, b);
    }
  }
  // Small pad past included boundaries so band edges are not flush with the frame.
  const pad = Math.max(span * 0.06, 0.4);
  return {
    displayMin: Math.max(0, min - pad),
    displayMax: max + pad,
  };
}

/**
 * Resolve chart Y domain from valid observations.
 * High/Low summary must still use raw observations — this is display domain only.
 */
export function resolveWeightTrendYDomain(
  input: WeightTrendYDomainInput,
): WeightTrendYDomain {
  const values = input.valuesKg.filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) {
    return { displayMin: 0, displayMax: 1, outlierCount: 0 };
  }

  const minW = Math.min(...values);
  const maxW = Math.max(...values);
  const boundaries = input.classificationBoundariesKg ?? [];

  if (input.valueKind === "mass" && (input.unitLabel === "lb" || input.unitLabel === "kg")) {
    let axisMin = minW;
    let axisMax = maxW;
    if (boundaries.length > 0) {
      const expanded = expandDomainForClassificationBoundaries({
        displayMin: minW,
        displayMax: maxW,
        boundariesKg: boundaries,
      });
      axisMin = expanded.displayMin;
      axisMax = expanded.displayMax;
    }
    const axis = buildWeightAxisTicks({
      minKg: axisMin,
      maxKg: axisMax,
      unit: input.unitLabel,
    });
    if (axis.status === "ready") {
      const outlierCount = values.filter(
        (v) => v < axis.domainMinKg || v > axis.domainMaxKg,
      ).length;
      return {
        displayMin: axis.domainMinKg,
        displayMax: axis.domainMaxKg,
        outlierCount,
      };
    }
  }

  // Generic metrics (e.g. body fat %): padded observed domain — no clean mass steps.
  const range = maxW - minW || MIN_SPAN_GENERIC;
  const padding = Math.max(EDGE_PAD_RATIO * range, range * 0.05);
  let dMin = Math.max(0, minW - padding);
  let dMax = maxW + padding;
  if (dMax - dMin < MIN_SPAN_GENERIC) {
    const mid = (dMin + dMax) / 2;
    dMin = Math.max(0, mid - MIN_SPAN_GENERIC / 2);
    dMax = mid + MIN_SPAN_GENERIC / 2;
  }
  if (boundaries.length > 0) {
    const expanded = expandDomainForClassificationBoundaries({
      displayMin: dMin,
      displayMax: dMax,
      boundariesKg: boundaries,
    });
    dMin = expanded.displayMin;
    dMax = expanded.displayMax;
  }
  const outlierCount = values.filter((v) => v < dMin || v > dMax).length;
  return { displayMin: dMin, displayMax: dMax, outlierCount };
}
