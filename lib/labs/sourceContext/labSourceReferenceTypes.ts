/**
 * Source-attributed laboratory reference context (Phase 3D-C).
 * Never invents Oli classifications — report facts only.
 */

export type LabSourceReferenceStatus =
  | "within_reference"
  | "above_reference"
  | "below_reference"
  | "provider_category"
  | "qualitative_expected"
  | "qualitative_unexpected"
  | "pattern_expected"
  | "pattern_non_expected"
  | "reference_unavailable"
  | "not_evaluable";

export type LabSourceProviderCategory =
  | "optimal"
  | "moderate"
  | "high"
  | "low"
  | "normal"
  | "abnormal"
  | "other"
  | null;

export type LabSourceFlag =
  | "high"
  | "low"
  | "critical_high"
  | "critical_low"
  | "abnormal"
  | "normal"
  | "positive"
  | "negative"
  | "none"
  | "unknown";

export type LabSourceReferenceContext = {
  status: LabSourceReferenceStatus;
  providerName: string | null;
  referenceLabel: string | null;
  referenceRaw: string | null;
  providerCategory: LabSourceProviderCategory;
  sourceFlag: LabSourceFlag;
  source: "laboratory_report";
};

export type LabReferenceContextCompatibility =
  | "compatible_same_reference"
  | "different_reference"
  | "different_lab"
  | "different_method"
  | "different_specimen"
  | "missing_reference"
  | "not_comparable";
