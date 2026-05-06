// lib/features/profile/profileMetricCoverage.ts
import { formatMetricValue, type MetricDataContext } from "@/lib/metrics/metricDisplay";
import { MANAGE_METRIC_MAP, type ManageMetricConfig } from "@/lib/features/profile/manageMetricDefinitions";
import { CATEGORY_ID_TO_METRIC_CATEGORY_ID } from "@/lib/features/profile/healthRecordCategories";

const DASH = "—";

function metricHasDisplayValue(m: ManageMetricConfig, ctx: MetricDataContext): boolean {
  const v = formatMetricValue(m, ctx);
  return v !== DASH && v.trim().length > 0;
}

/**
 * Counts supported metrics with a non-empty formatted value vs total supported metrics in the category slice.
 */
export function getSupportedMetricCoverage(
  healthCategoryId: string,
  ctx: MetricDataContext,
): { withData: number; totalSupported: number } {
  const metricCategoryId = CATEGORY_ID_TO_METRIC_CATEGORY_ID[healthCategoryId];
  if (!metricCategoryId) return { withData: 0, totalSupported: 0 };
  const config = MANAGE_METRIC_MAP.find((c) => c.categoryId === metricCategoryId);
  if (!config) return { withData: 0, totalSupported: 0 };
  const supported = config.metrics.filter((m) => m.supportedNow);
  let withData = 0;
  for (const m of supported) {
    if (metricHasDisplayValue(m, ctx)) withData++;
  }
  return { withData, totalSupported: supported.length };
}
