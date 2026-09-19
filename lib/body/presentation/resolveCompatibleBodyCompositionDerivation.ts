/**
 * Compatibility-gated Body Composition derivations (fat mass, lean %).
 *
 * Fail closed unless pairing evidence proves Weight and composition metrics
 * belong to the same measurement event. Overview latest-value merges by day
 * are not sufficient provenance for silent combination.
 */

import type { BodyDerivedQuantityResult } from "@/lib/body/presentation/bodyMetricPrimaryViews";

export type BodyCompositionPairingEvidence = {
  readonly weightKg: number | null;
  readonly bodyFatPercent: number | null;
  readonly leanBodyMassKg: number | null;
  /**
   * True only when Weight and Body Fat % are known to share one measurement
   * event (same raw/sample identity). Same calendar day alone is insufficient.
   */
  readonly weightAndBodyFatSameEvent?: boolean;
  /**
   * True only when Lean Body Mass and Weight share one measurement event.
   */
  readonly weightAndLeanSameEvent?: boolean;
};

function finitePositive(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

function finitePercent(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n >= 0 && n <= 100;
}

/**
 * Derive fat mass (kg) from compatible Weight × Body Fat fraction.
 */
export function resolveCompatibleFatMassKg(
  evidence: BodyCompositionPairingEvidence,
): BodyDerivedQuantityResult {
  if (!finitePercent(evidence.bodyFatPercent)) {
    return {
      status: "missing",
      valueKg: null,
      reason: "Body Fat percentage is missing.",
    };
  }
  if (!finitePositive(evidence.weightKg)) {
    return {
      status: "missing",
      valueKg: null,
      reason: "Weight is missing.",
    };
  }
  if (evidence.weightAndBodyFatSameEvent !== true) {
    return {
      status: "incompatible",
      valueKg: null,
      reason:
        "Fat mass is available only when Weight and Body Fat come from the same measurement.",
    };
  }
  const valueKg = evidence.weightKg * (evidence.bodyFatPercent / 100);
  if (!Number.isFinite(valueKg) || valueKg < 0) {
    return {
      status: "error",
      valueKg: null,
      reason: "Fat mass could not be calculated.",
    };
  }
  return {
    status: "ready",
    valueKg,
    provenanceLabel: "Calculated from compatible Weight and Body Fat measurements",
  };
}

/**
 * Derive lean mass percentage from compatible Lean Body Mass / total Weight.
 * Not skeletal-muscle %, ALMI, or appendicular lean mass.
 */
export function resolveCompatibleLeanMassPercentage(
  evidence: BodyCompositionPairingEvidence,
): BodyDerivedQuantityResult & { readonly percent?: number | null } {
  if (!finitePositive(evidence.leanBodyMassKg)) {
    return {
      status: "missing",
      valueKg: null,
      reason: "Lean Mass is missing.",
      percent: null,
    };
  }
  if (!finitePositive(evidence.weightKg)) {
    return {
      status: "missing",
      valueKg: null,
      reason: "Weight is missing.",
      percent: null,
    };
  }
  if (evidence.weightAndLeanSameEvent !== true) {
    return {
      status: "incompatible",
      valueKg: null,
      reason:
        "Lean Mass percentage is available only when Lean Mass and Weight come from the same measurement.",
      percent: null,
    };
  }
  if (evidence.leanBodyMassKg > evidence.weightKg) {
    return {
      status: "conflicting",
      valueKg: null,
      reason: "Lean Mass exceeds total Weight for this measurement.",
      percent: null,
    };
  }
  const percent = (evidence.leanBodyMassKg / evidence.weightKg) * 100;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return {
      status: "error",
      valueKg: null,
      reason: "Lean Mass percentage could not be calculated.",
      percent: null,
    };
  }
  return {
    status: "ready",
    valueKg: evidence.leanBodyMassKg,
    provenanceLabel: "Calculated from compatible Lean Mass and Weight measurements",
    percent,
  };
}
