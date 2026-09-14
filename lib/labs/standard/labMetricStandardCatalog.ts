/**
 * Narrow Phase 3D-C display standards for common lab metrics.
 * These are consumer understanding thresholds — not Oli elite/deficient scoring
 * and not laboratory-company branding.
 */

import type { LabMetricStandardDefinition } from "./labMetricStandardTypes";

/**
 * Total Cholesterol: desirable adult threshold commonly used for consumer context
 * (aligned with long-standing desirable <200 mg/dL framing).
 */
export const TOTAL_CHOLESTEROL_STANDARD: LabMetricStandardDefinition = {
  metricKey: "total_cholesterol",
  unit: "mg/dL",
  kind: "upper_bound",
  upper: { value: 200, inclusive: false },
  standardLabel: "Under 200 mg/dL",
  evidenceNote: "Desirable adult total cholesterol threshold for consumer context.",
};

/** HDL-C: common adult lower desirable threshold. */
export const HDL_C_STANDARD: LabMetricStandardDefinition = {
  metricKey: "hdl_c",
  unit: "mg/dL",
  kind: "lower_bound",
  lower: { value: 40, inclusive: true },
  standardLabel: "40 mg/dL or higher",
  evidenceNote: "Common adult HDL-C lower desirable threshold for consumer context.",
};

/** Fasting glucose: common adult reference interval for consumer context. */
export const GLUCOSE_STANDARD: LabMetricStandardDefinition = {
  metricKey: "glucose",
  unit: "mg/dL",
  kind: "bounded",
  lower: { value: 70, inclusive: true },
  upper: { value: 99, inclusive: true },
  standardLabel: "70–99 mg/dL",
  evidenceNote: "Common adult fasting glucose interval for consumer context.",
};

const BY_KEY: ReadonlyMap<string, LabMetricStandardDefinition> = new Map(
  [TOTAL_CHOLESTEROL_STANDARD, HDL_C_STANDARD, GLUCOSE_STANDARD].map((s) => [
    s.metricKey,
    s,
  ]),
);

export function getLabMetricStandard(
  metricKey: string | null | undefined,
): LabMetricStandardDefinition | null {
  if (!metricKey) return null;
  return BY_KEY.get(metricKey) ?? null;
}
