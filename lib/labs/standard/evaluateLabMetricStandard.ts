/**
 * Evaluate a numeric lab value against a Phase 3D-C metric standard.
 * Pure — no React, network, or Firebase.
 */

import type {
  LabMetricStandardDefinition,
  LabMetricStandardEvaluation,
  LabMetricStandardStatus,
} from "./labMetricStandardTypes";

function boundOk(
  value: number,
  bound: { value: number; inclusive: boolean } | undefined,
  side: "lower" | "upper",
): boolean | null {
  if (!bound) return null;
  if (side === "lower") {
    return bound.inclusive ? value >= bound.value : value > bound.value;
  }
  return bound.inclusive ? value <= bound.value : value < bound.value;
}

export function evaluateLabMetricStandardStatus(
  value: number,
  standard: LabMetricStandardDefinition,
): LabMetricStandardStatus {
  if (!Number.isFinite(value)) return "not_evaluable";

  if (standard.kind === "upper_bound") {
    const ok = boundOk(value, standard.upper, "upper");
    if (ok === true) return "within_standard";
    if (ok === false) return "above_standard";
    return "not_evaluable";
  }

  if (standard.kind === "lower_bound") {
    const ok = boundOk(value, standard.lower, "lower");
    if (ok === true) return "within_standard";
    if (ok === false) return "below_standard";
    return "not_evaluable";
  }

  const lowerOk = boundOk(value, standard.lower, "lower");
  const upperOk = boundOk(value, standard.upper, "upper");
  if (lowerOk === false) return "below_standard";
  if (upperOk === false) return "above_standard";
  if (lowerOk === true && upperOk === true) return "within_standard";
  return "not_evaluable";
}

export function evaluateLabMetricStandard(
  value: number,
  standard: LabMetricStandardDefinition,
): LabMetricStandardEvaluation {
  return {
    status: evaluateLabMetricStandardStatus(value, standard),
    standard,
    value,
  };
}
