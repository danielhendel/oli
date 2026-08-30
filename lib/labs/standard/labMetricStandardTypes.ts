/**
 * Phase 3D-C consumer metric-standard model.
 * Separable from source-lab report references. No treatment advice.
 * No Deficient/Healthy/Strong/Optimal/Elite classification labels.
 */

export type LabMetricStandardKind = "upper_bound" | "lower_bound" | "bounded";

export type LabMetricStandardStatus =
  | "within_standard"
  | "above_standard"
  | "below_standard"
  | "not_evaluable";

export type LabMetricStandardDefinition = {
  metricKey: string;
  unit: string;
  kind: LabMetricStandardKind;
  /** Inclusive lower bound when kind is lower_bound or bounded. */
  lower?: { value: number; inclusive: boolean };
  /** Inclusive upper bound when kind is upper_bound or bounded. */
  upper?: { value: number; inclusive: boolean };
  /** Plain consumer phrase, e.g. "Under 200 mg/dL". */
  standardLabel: string;
  /** Short provenance for secondary/source context only. */
  evidenceNote: string;
};

export type LabMetricStandardEvaluation = {
  status: LabMetricStandardStatus;
  standard: LabMetricStandardDefinition;
  value: number;
};
