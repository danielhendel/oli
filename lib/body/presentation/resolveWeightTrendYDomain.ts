/**
 * Deterministic Y-domain for Weight (and mass) trend charts.
 * Mass display units use clean axis ticks (5 lb / 2 kg).
 * Observation-driven only — classification bands clip to this domain and must
 * not expand it.
 */

import { buildWeightAxisTicks } from "@/lib/body/presentation/buildWeightAxisTicks";

export type WeightTrendYDomainInput = {
  readonly valuesKg: readonly number[];
  readonly valueKind: "mass" | "generic";
  /** Display unit label — used only to pick mass span heuristics for lb vs kg. */
  readonly unitLabel: string;
};

export type WeightTrendYDomain = {
  readonly displayMin: number;
  readonly displayMax: number;
  readonly outlierCount: number;
};

/** Extra edge padding so generic (non-mass) lines do not kiss the plot boundary. */
const EDGE_PAD_RATIO = 0.12;
const MIN_SPAN_GENERIC = 1;

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

  if (input.valueKind === "mass" && (input.unitLabel === "lb" || input.unitLabel === "kg")) {
    const axis = buildWeightAxisTicks({
      minKg: minW,
      maxKg: maxW,
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
  const outlierCount = values.filter((v) => v < dMin || v > dMax).length;
  return { displayMin: dMin, displayMax: dMax, outlierCount };
}
