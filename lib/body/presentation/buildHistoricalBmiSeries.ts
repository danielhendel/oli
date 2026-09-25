/**
 * Historical BMI presentation series — derived from Weight × governed profile height.
 * Presentation-only; never persisted.
 */

import { bmiFromWeightAndHeight } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

/**
 * Map each valid Weight observation to a BMI point using the same height contract
 * as the Weight card (canonical profile heightCm).
 *
 * Missing/invalid height → empty series (fail closed).
 */
export function buildHistoricalBmiSeries(args: {
  readonly weightPoints: readonly WeightPoint[];
  readonly heightCm: number | null;
}): WeightPoint[] {
  const { heightCm } = args;
  if (heightCm == null || !Number.isFinite(heightCm) || heightCm <= 0) {
    return [];
  }
  const out: WeightPoint[] = [];
  for (const p of args.weightPoints) {
    if (!Number.isFinite(p.weightKg) || p.weightKg <= 0) continue;
    const bmi = bmiFromWeightAndHeight(p.weightKg, heightCm);
    if (bmi == null || !Number.isFinite(bmi) || bmi <= 0) continue;
    out.push({
      observedAt: p.observedAt,
      dayKey: p.dayKey,
      weightKg: bmi,
      sourceId: p.sourceId,
    });
  }
  return out.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}
