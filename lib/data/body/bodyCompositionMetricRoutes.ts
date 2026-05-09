/**
 * Stable expo-router paths for Body Composition metric detail screens.
 * Shared by Body overview and Dash Body Composition card.
 */
export const BODY_METRIC_RANGES_EXPLAINER_HREF = "/(app)/body/body-metric-ranges-explainer" as const;

export const BODY_COMPOSITION_METRIC_DETAIL_ROUTES = {
  weight: "/(app)/body/metric/weight",
  bodyFat: "/(app)/body/metric/body-fat",
  bmi: "/(app)/body/metric/bmi",
  leanMass: "/(app)/body/metric/lean-mass",
  rmr: "/(app)/body/metric/rmr",
} as const;
