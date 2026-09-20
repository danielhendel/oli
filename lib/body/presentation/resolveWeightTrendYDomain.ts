/**
 * Deterministic Y-domain for Weight (and mass) trend charts.
 * Observation-driven — no zero-floor, no healthy-band padding.
 */

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

const LBS_PER_KG = 2.2046226218;
/** Minimum Y-axis span to avoid exaggerating tiny mass changes. */
const MIN_SPAN_LB = 12;
const MIN_SPAN_KG = 5.5;
const MIN_PAD_LB = 2;
const MIN_PAD_KG = 0.9;
/** Extra edge padding so the line does not kiss the plot boundary. */
const EDGE_PAD_RATIO = 0.12;

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
  const n = values.length;

  let dMin: number;
  let dMax: number;

  if (n < 3) {
    const mid = (minW + maxW) / 2;
    const spanMinKg =
      input.valueKind === "mass" && input.unitLabel === "lb"
        ? MIN_SPAN_LB / LBS_PER_KG
        : MIN_SPAN_KG;
    const half = Math.max((maxW - minW) / 2 + spanMinKg * EDGE_PAD_RATIO, spanMinKg / 2);
    dMin = Math.max(0, mid - half);
    dMax = mid + half;
  } else {
    const sorted = [...values].sort((a, b) => a - b);
    const p05 = sorted[Math.floor((n - 1) * 0.05)] ?? minW;
    const p95 = sorted[Math.floor((n - 1) * 0.95)] ?? maxW;
    const range = p95 - p05 || 0.1;
    const padding = Math.max(EDGE_PAD_RATIO * range, range * 0.02);
    dMin = p05 - padding;
    dMax = p95 + padding;

    const spanMinKg =
      input.valueKind === "mass" && input.unitLabel === "lb"
        ? MIN_SPAN_LB / LBS_PER_KG
        : MIN_SPAN_KG;
    const padMinKg =
      input.valueKind === "mass" && input.unitLabel === "lb"
        ? MIN_PAD_LB / LBS_PER_KG
        : MIN_PAD_KG;
    const currentSpanKg = dMax - dMin;
    const midKg = (dMin + dMax) / 2;
    if (currentSpanKg < spanMinKg) {
      dMin = midKg - spanMinKg / 2;
      dMax = midKg + spanMinKg / 2;
    } else {
      if (midKg - dMin < padMinKg) dMin = midKg - padMinKg;
      if (dMax - midKg < padMinKg) dMax = midKg + padMinKg;
    }
    dMin = Math.max(0, dMin);
  }

  const outlierCount = values.filter((v) => v < dMin || v > dMax).length;
  return { displayMin: dMin, displayMax: dMax, outlierCount };
}
