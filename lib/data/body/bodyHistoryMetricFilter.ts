/**
 * Typed Body history metric filter for calendar / list routes.
 * Metric detail headers own calendar + list; landing does not.
 */

export type BodyHistoryMetricFilter = "weight" | "bodyFat" | "leanTissue";

export const BODY_HISTORY_METRIC_TITLES: Record<BodyHistoryMetricFilter, string> = {
  weight: "Weight",
  bodyFat: "Body Fat",
  leanTissue: "Lean Mass",
};

const PARAM_ALIASES: Record<string, BodyHistoryMetricFilter> = {
  weight: "weight",
  bodyFat: "bodyFat",
  "body-fat": "bodyFat",
  body_fat: "bodyFat",
  leanTissue: "leanTissue",
  "lean-mass": "leanTissue",
  lean_mass: "leanTissue",
  leanMass: "leanTissue",
};

/** Parse `?metric=` from calendar/list routes. Defaults to weight when absent/invalid. */
export function parseBodyHistoryMetricParam(raw: unknown): BodyHistoryMetricFilter {
  if (typeof raw !== "string" || raw.length === 0) return "weight";
  return PARAM_ALIASES[raw] ?? "weight";
}

export function bodyHistoryCalendarHref(metric: BodyHistoryMetricFilter): string {
  return `/(app)/body/calendar?metric=${metric}`;
}

export function bodyHistoryListHref(metric: BodyHistoryMetricFilter): string {
  return `/(app)/body/list?metric=${metric}`;
}

export function bodyHistoryCalendarAccessibilityLabel(metric: BodyHistoryMetricFilter): string {
  return `Open ${BODY_HISTORY_METRIC_TITLES[metric]} calendar`;
}

export function bodyHistoryListAccessibilityLabel(metric: BodyHistoryMetricFilter): string {
  return `Open ${BODY_HISTORY_METRIC_TITLES[metric]} history`;
}

export function bodyMetricDetailBackAccessibilityLabel(): string {
  return "Back to Body Composition";
}

/** Route param segment → history filter (for metric detail headers). */
export function bodyHistoryMetricFromDetailParam(
  metricParam: string | undefined,
): BodyHistoryMetricFilter | null {
  if (metricParam == null) return null;
  if (metricParam === "weight") return "weight";
  if (metricParam === "body-fat") return "bodyFat";
  if (metricParam === "lean-mass") return "leanTissue";
  return null;
}
