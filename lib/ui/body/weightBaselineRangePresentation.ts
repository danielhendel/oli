import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

/**
 * Absolute span between 90-day low and high (same rounding as {@link formatBodyWeight}).
 * Presentation-only — not used for classification.
 */
export function formatNinetyDayRangeDeltaLabel(
  lowKg: number,
  highKg: number,
  unit: "kg" | "lb",
): string {
  const diffKg = Math.abs(highKg - lowKg);
  return formatBodyWeight(diffKg, unit);
}
