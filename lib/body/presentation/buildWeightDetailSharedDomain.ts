/**
 * One shared Weight Y-domain for every period selector on Weight detail.
 * Derived from the full available history — not from the filtered period series.
 */

import {
  buildWeightAxisTicks,
  type WeightAxisTicksModel,
  type WeightAxisUnit,
} from "@/lib/body/presentation/buildWeightAxisTicks";

export type BuildWeightDetailSharedDomainInput = {
  /** All available Weight observations (kg) for the detail experience. */
  readonly valuesKg: readonly number[];
  readonly unit: WeightAxisUnit;
};

/**
 * Build the locked Y-axis domain + ticks shared by 7D…All.
 * Switching period must not rescale these ticks.
 */
export function buildWeightDetailSharedDomain(
  input: BuildWeightDetailSharedDomainInput,
): WeightAxisTicksModel {
  const values = input.valuesKg.filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) {
    return {
      status: "unavailable",
      domainMinKg: 0,
      domainMaxKg: 1,
      ticks: [],
      step: input.unit === "lb" ? 10 : 5,
      unit: input.unit,
    };
  }
  return buildWeightAxisTicks({
    minKg: Math.min(...values),
    maxKg: Math.max(...values),
    unit: input.unit,
  });
}
