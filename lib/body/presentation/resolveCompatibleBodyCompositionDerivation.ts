/**
 * Compatibility-gated Body Composition pairing + derivations (fat mass, lean %).
 *
 * Provenance hierarchy (strongest first):
 * 1. Same measurement/raw-event identity
 * 2. Same sourceId + identical observedAt
 * 3. Existing approved Body overview snapshot-day merge
 *    (`bodyMetricsForSnapshotDay` / `compositionMetricsFromPeekRowsForSnapshotDay`)
 *
 * Same calendar date alone is not accepted unless it is that snapshot-day rule
 * (overviewDay set and both values present on that day).
 */

import type { BodyDerivedQuantityResult } from "@/lib/body/presentation/bodyMetricPrimaryViews";

export type BodyCompositionCompatibilityBasis =
  | "same_measurement_group"
  | "same_origin_and_timestamp"
  | "existing_approved_pairing_rule";

export type BodyMeasurementPairingStatus =
  | "compatible"
  | "missing_weight"
  | "missing_composition"
  | "different_origin"
  | "different_method"
  | "outside_pairing_window"
  | "stale"
  | "conflicting"
  | "unknown_provenance"
  | "invalid";

export type BodyMeasurementPairingResult =
  | {
      readonly status: "compatible";
      readonly weightKg: number;
      readonly compositionValue: number;
      readonly observedAt: string | null;
      readonly sourceSummary: string;
      readonly compatibilityBasis: BodyCompositionCompatibilityBasis;
    }
  | {
      readonly status: Exclude<BodyMeasurementPairingStatus, "compatible">;
    };

/**
 * Evidence available to the Body Composition landing presentation layer.
 * Prefer stronger fields when present; overviewDay enables the approved snapshot-day rule.
 */
export type BodyCompositionPairingEvidence = {
  readonly weightKg: number | null;
  readonly bodyFatPercent: number | null;
  readonly leanBodyMassKg: number | null;
  /** Local calendar day of the Body overview snapshot (YYYY-MM-DD). */
  readonly overviewDay?: string | null;
  readonly latestObservedAtIso?: string | null;
  /** Same raw/sample identity for Weight + Body Fat when known. */
  readonly weightAndBodyFatSameEvent?: boolean;
  /** Same raw/sample identity for Weight + Lean Mass when known. */
  readonly weightAndLeanSameEvent?: boolean;
  readonly weightObservedAt?: string | null;
  readonly bodyFatObservedAt?: string | null;
  readonly leanObservedAt?: string | null;
  readonly weightSourceId?: string | null;
  readonly bodyFatSourceId?: string | null;
  readonly leanSourceId?: string | null;
  readonly weightMethod?: string | null;
  readonly bodyFatMethod?: string | null;
  readonly leanMethod?: string | null;
};

function finitePositive(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

function finitePercent(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n >= 0 && n <= 100;
}

function hasOverviewDay(day: string | null | undefined): day is string {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

function methodsConflict(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null || a.length === 0 || b.length === 0) return false;
  if (a === "unknown" || b === "unknown") return false;
  // Apple Health is transport, not a measurement method — do not treat as method conflict.
  if (a === "apple_health" || b === "apple_health") return false;
  return a !== b;
}

function resolvePairing(input: {
  weightKg: number | null;
  compositionValue: number | null;
  compositionKind: "bodyFat" | "leanMass";
  evidence: BodyCompositionPairingEvidence;
}): BodyMeasurementPairingResult {
  const compositionMissing =
    input.compositionKind === "bodyFat"
      ? !finitePercent(input.compositionValue)
      : !finitePositive(input.compositionValue);

  if (compositionMissing) {
    return { status: "missing_composition" };
  }
  if (!finitePositive(input.weightKg)) {
    return { status: "missing_weight" };
  }

  const weightKg = input.weightKg;
  const compositionValue = input.compositionValue as number;

  if (input.compositionKind === "leanMass" && compositionValue > weightKg) {
    return { status: "conflicting" };
  }

  const sameEventFlag =
    input.compositionKind === "bodyFat"
      ? input.evidence.weightAndBodyFatSameEvent === true
      : input.evidence.weightAndLeanSameEvent === true;

  if (sameEventFlag) {
    return {
      status: "compatible",
      weightKg,
      compositionValue,
      observedAt: input.evidence.latestObservedAtIso ?? null,
      sourceSummary: "Same measurement",
      compatibilityBasis: "same_measurement_group",
    };
  }

  const weightAt =
    input.compositionKind === "bodyFat"
      ? input.evidence.weightObservedAt
      : input.evidence.weightObservedAt;
  const compAt =
    input.compositionKind === "bodyFat"
      ? input.evidence.bodyFatObservedAt
      : input.evidence.leanObservedAt;
  const weightSource =
    input.compositionKind === "bodyFat"
      ? input.evidence.weightSourceId
      : input.evidence.weightSourceId;
  const compSource =
    input.compositionKind === "bodyFat"
      ? input.evidence.bodyFatSourceId
      : input.evidence.leanSourceId;
  const weightMethod =
    input.compositionKind === "bodyFat"
      ? input.evidence.weightMethod
      : input.evidence.weightMethod;
  const compMethod =
    input.compositionKind === "bodyFat"
      ? input.evidence.bodyFatMethod
      : input.evidence.leanMethod;

  if (methodsConflict(weightMethod, compMethod)) {
    return { status: "different_method" };
  }

  if (
    typeof weightAt === "string" &&
    weightAt.length > 0 &&
    typeof compAt === "string" &&
    compAt.length > 0 &&
    typeof weightSource === "string" &&
    weightSource.length > 0 &&
    typeof compSource === "string" &&
    compSource.length > 0
  ) {
    if (weightSource !== compSource) {
      return { status: "different_origin" };
    }
    if (weightAt === compAt) {
      return {
        status: "compatible",
        weightKg,
        compositionValue,
        observedAt: weightAt,
        sourceSummary: "Same source and time",
        compatibilityBasis: "same_origin_and_timestamp",
      };
    }
    return { status: "outside_pairing_window" };
  }

  // Approved Body overview rule: metrics co-presented on one snapshot day are
  // the day's composition picture (see bodySnapshot same-day merge).
  if (hasOverviewDay(input.evidence.overviewDay)) {
    return {
      status: "compatible",
      weightKg,
      compositionValue,
      observedAt: input.evidence.latestObservedAtIso ?? null,
      sourceSummary: "Same Body overview day",
      compatibilityBasis: "existing_approved_pairing_rule",
    };
  }

  return { status: "unknown_provenance" };
}

export function resolveBodyFatWeightPairing(
  evidence: BodyCompositionPairingEvidence,
): BodyMeasurementPairingResult {
  return resolvePairing({
    weightKg: evidence.weightKg,
    compositionValue: evidence.bodyFatPercent,
    compositionKind: "bodyFat",
    evidence,
  });
}

export function resolveLeanMassWeightPairing(
  evidence: BodyCompositionPairingEvidence,
): BodyMeasurementPairingResult {
  return resolvePairing({
    weightKg: evidence.weightKg,
    compositionValue: evidence.leanBodyMassKg,
    compositionKind: "leanMass",
    evidence,
  });
}

function pairingUnavailableReason(
  status: Exclude<BodyMeasurementPairingStatus, "compatible">,
  kind: "fatMass" | "leanPercent",
): string {
  switch (status) {
    case "missing_weight":
      return kind === "fatMass"
        ? "A compatible Weight measurement is needed to calculate fat mass."
        : "A compatible Weight measurement is needed to calculate Lean Mass percentage.";
    case "missing_composition":
      return kind === "fatMass"
        ? "Body Fat percentage is missing."
        : "Lean Mass is missing.";
    case "different_origin":
    case "different_method":
    case "outside_pairing_window":
    case "stale":
    case "conflicting":
    case "unknown_provenance":
    case "invalid":
      return kind === "fatMass"
        ? "A compatible Weight measurement is needed to calculate fat mass."
        : "A compatible Weight measurement is needed to calculate Lean Mass percentage.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Derive fat mass (kg) from compatible Weight × Body Fat fraction.
 */
export function resolveCompatibleFatMassKg(
  evidence: BodyCompositionPairingEvidence,
): BodyDerivedQuantityResult {
  const pairing = resolveBodyFatWeightPairing(evidence);
  if (pairing.status !== "compatible") {
    return {
      status:
        pairing.status === "missing_weight" || pairing.status === "missing_composition"
          ? "missing"
          : pairing.status === "conflicting"
            ? "conflicting"
            : "incompatible",
      valueKg: null,
      reason: pairingUnavailableReason(pairing.status, "fatMass"),
    };
  }
  const valueKg = pairing.weightKg * (pairing.compositionValue / 100);
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
  const pairing = resolveLeanMassWeightPairing(evidence);
  if (pairing.status !== "compatible") {
    return {
      status:
        pairing.status === "missing_weight" || pairing.status === "missing_composition"
          ? "missing"
          : pairing.status === "conflicting"
            ? "conflicting"
            : "incompatible",
      valueKg: null,
      reason: pairingUnavailableReason(pairing.status, "leanPercent"),
      percent: null,
    };
  }
  const percent = (pairing.compositionValue / pairing.weightKg) * 100;
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
    valueKg: pairing.compositionValue,
    provenanceLabel: "Calculated from compatible Lean Mass and Weight measurements",
    percent,
  };
}
