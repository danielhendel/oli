/**
 * One shared Body Fat Y-domain for every period selector on Body Fat detail.
 * Derived from the full available history — not from the filtered period series.
 */

import {
  buildBodyFatAxisTicks,
  type BodyFatAxisTicksModel,
} from "@/lib/body/presentation/buildBodyFatAxisTicks";

export type BuildBodyFatDetailSharedDomainInput = {
  /** All available Body Fat observations (%) for the detail experience. */
  readonly valuesPercent: readonly number[];
};

/**
 * Build the locked Y-axis domain + ticks shared by 7D…All.
 * Switching period must not rescale these ticks.
 */
export function buildBodyFatDetailSharedDomain(
  input: BuildBodyFatDetailSharedDomainInput,
): BodyFatAxisTicksModel {
  const values = input.valuesPercent.filter(
    (v) => Number.isFinite(v) && v > 0 && v <= 100,
  );
  if (values.length === 0) {
    return {
      status: "unavailable",
      domainMinPercent: 0,
      domainMaxPercent: 1,
      ticks: [],
      step: 2,
    };
  }
  return buildBodyFatAxisTicks({
    minPercent: Math.min(...values),
    maxPercent: Math.max(...values),
  });
}
