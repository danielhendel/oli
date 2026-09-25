/**
 * Raw-event kinds needed for a single Body trend metric.
 * Body Fat must include `weight` because Apple Health coalesces same-day BF onto weight payloads.
 */

export type BodyTrendMetricKind = "weight" | "body_composition";

export function trendKindsForMetric(
  metric:
    | "weight"
    | "body_fat_percent"
    | "bmi"
    | "lean_body_mass"
    | "resting_metabolic_rate",
): BodyTrendMetricKind[] {
  if (metric === "weight") return ["weight"];
  if (metric === "body_fat_percent") return ["weight", "body_composition"];
  return ["body_composition"];
}
