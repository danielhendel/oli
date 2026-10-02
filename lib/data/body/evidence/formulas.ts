/**
 * Deterministic Body Composition index helpers (pure).
 *
 * Callers must supply explicit compatible input observations.
 * The evidence bridge never auto-selects cross-source inputs.
 * Building an evidence bundle never emits these indices automatically.
 *
 * Precision policy:
 * - Inputs are used as supplied (no rounding of source observations).
 * - Results are IEEE-754 double division; callers may format for display separately.
 * - Reproducibility requires formulaVersion + inputObservationRefs + canonical values.
 */

import type { BodyCompositionEvidenceObservation } from "@oli/contracts";

/** @deprecated Prefer per-index versions below. Kept for test/back-compat aliases. */
export const BODY_COMPOSITION_FORMULA_VERSION = "bc_indices_v1" as const;

export const BMI_FORMULA_VERSION = "bmi_v1" as const;
export const WHTR_FORMULA_VERSION = "whtr_v1" as const;
export const FMI_FORMULA_VERSION = "fmi_v1" as const;
export const FFMI_FORMULA_VERSION = "ffmi_v1" as const;
export const ALMI_FORMULA_VERSION = "almi_v1" as const;

export type FormulaHelperResult =
  | {
      ok: true;
      observation: BodyCompositionEvidenceObservation;
    }
  | { ok: false; reason: "invalid_height" | "invalid_input" | "incompatible_units" };

function requirePositiveFinite(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function calculatedBase(args: {
  observationId: string;
  metricKey: BodyCompositionEvidenceObservation["metricKey"];
  value: number;
  unit: BodyCompositionEvidenceObservation["canonicalUnit"];
  measuredAt: string;
  inputRefs: readonly string[];
  formulaVersion: string;
  constructEligibility: BodyCompositionEvidenceObservation["constructEligibility"];
  redundancyGroup: BodyCompositionEvidenceObservation["redundancyGroup"];
  recencyClass: BodyCompositionEvidenceObservation["recencyClass"];
  comparabilityGroup: BodyCompositionEvidenceObservation["comparabilityGroup"];
}): BodyCompositionEvidenceObservation {
  return {
    observationId: args.observationId,
    metricKey: args.metricKey,
    region: "total",
    value: args.value,
    canonicalUnit: args.unit,
    measuredAt: args.measuredAt,
    evidenceType: "calculated",
    sourceReported: false,
    source: {
      sourceSystem: "unknown",
      measurementMethod: "other",
      deviceFamily: null,
      deviceModel: null,
    },
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: null,
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: args.formulaVersion,
      inputObservationRefs: [...args.inputRefs],
      corrected: null,
      protocolId: null,
      protocolVersion: null,
    },
    continuousTrendEligible: false,
    comparabilityGroup: args.comparabilityGroup,
    recencyClass: args.recencyClass,
    constructEligibility: [...args.constructEligibility],
    redundancyGroup: args.redundancyGroup,
  };
}

/** BMI = bodyMassKg / heightM² — effectiveAt = body-mass observation date. */
export function calculateBmiObservation(args: {
  bodyMassKg: number;
  heightCm: number;
  measuredAt: string;
  inputObservationRefs: readonly string[];
  observationId?: string;
}): FormulaHelperResult {
  if (!requirePositiveFinite(args.bodyMassKg) || !requirePositiveFinite(args.heightCm)) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!args.measuredAt?.trim()) return { ok: false, reason: "invalid_input" };
  if (!args.inputObservationRefs.length) return { ok: false, reason: "invalid_input" };
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.bodyMassKg / (heightM * heightM);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid_input" };
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:bmi:${args.inputObservationRefs.join("+")}`,
      metricKey: "bmi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      formulaVersion: BMI_FORMULA_VERSION,
      constructEligibility: [],
      redundancyGroup: "none",
      recencyClass: "fast",
      comparabilityGroup: "unknown",
    }),
  };
}

/** WHtR = waistCm / heightCm — effectiveAt = Waist observation date. */
export function calculateWhtrObservation(args: {
  waistCm: number;
  heightCm: number;
  measuredAt: string;
  inputObservationRefs: readonly string[];
  observationId?: string;
}): FormulaHelperResult {
  if (!requirePositiveFinite(args.waistCm) || !requirePositiveFinite(args.heightCm)) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!args.measuredAt?.trim()) return { ok: false, reason: "invalid_input" };
  if (!args.inputObservationRefs.length) return { ok: false, reason: "invalid_input" };
  const value = args.waistCm / args.heightCm;
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid_input" };
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:whtr:${args.inputObservationRefs.join("+")}`,
      metricKey: "whtr",
      value,
      unit: "ratio",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      formulaVersion: WHTR_FORMULA_VERSION,
      constructEligibility: ["H1"],
      redundancyGroup: "waist_whtr",
      recencyClass: "moderate",
      comparabilityGroup: "manual_anthropometry",
    }),
  };
}

/** FMI = fatMassKg / heightM² — do not derive fat mass from Weight × BF% here. */
export function calculateFmiObservation(args: {
  fatMassKg: number;
  heightCm: number;
  measuredAt: string;
  inputObservationRefs: readonly string[];
  observationId?: string;
}): FormulaHelperResult {
  if (!requirePositiveFinite(args.heightCm) || !Number.isFinite(args.fatMassKg) || args.fatMassKg < 0) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!args.measuredAt?.trim()) return { ok: false, reason: "invalid_input" };
  if (!args.inputObservationRefs.length) return { ok: false, reason: "invalid_input" };
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.fatMassKg / (heightM * heightM);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid_input" };
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:fmi:${args.inputObservationRefs.join("+")}`,
      metricKey: "fmi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      formulaVersion: FMI_FORMULA_VERSION,
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
      recencyClass: "moderate",
      comparabilityGroup: "unknown",
    }),
  };
}

/** FFMI = fatFreeMassKg / heightM² — never substitute lean_mass for FFM. */
export function calculateFfmiObservation(args: {
  fatFreeMassKg: number;
  heightCm: number;
  measuredAt: string;
  inputObservationRefs: readonly string[];
  observationId?: string;
}): FormulaHelperResult {
  if (!requirePositiveFinite(args.heightCm) || !Number.isFinite(args.fatFreeMassKg) || args.fatFreeMassKg < 0) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!args.measuredAt?.trim()) return { ok: false, reason: "invalid_input" };
  if (!args.inputObservationRefs.length) return { ok: false, reason: "invalid_input" };
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.fatFreeMassKg / (heightM * heightM);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid_input" };
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:ffmi:${args.inputObservationRefs.join("+")}`,
      metricKey: "ffmi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      formulaVersion: FFMI_FORMULA_VERSION,
      constructEligibility: ["H3", "P1"],
      redundancyGroup: "lean_ffm_ffmi",
      recencyClass: "moderate",
      comparabilityGroup: "unknown",
    }),
  };
}

/**
 * ALMI = appendicularLeanMassKg / heightM².
 * Caller must supply already-summed compatible limb lean (same method/source).
 * Never inferred from total lean inside this helper.
 */
export function calculateAlmiObservation(args: {
  appendicularLeanMassKg: number;
  heightCm: number;
  measuredAt: string;
  inputObservationRefs: readonly string[];
  observationId?: string;
}): FormulaHelperResult {
  if (
    !requirePositiveFinite(args.heightCm) ||
    !Number.isFinite(args.appendicularLeanMassKg) ||
    args.appendicularLeanMassKg < 0
  ) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!args.measuredAt?.trim()) return { ok: false, reason: "invalid_input" };
  if (!args.inputObservationRefs.length) return { ok: false, reason: "invalid_input" };
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.appendicularLeanMassKg / (heightM * heightM);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid_input" };
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:almi:${args.inputObservationRefs.join("+")}`,
      metricKey: "almi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      formulaVersion: ALMI_FORMULA_VERSION,
      constructEligibility: ["P2"],
      redundancyGroup: "appendicular_lean_almi",
      recencyClass: "slow",
      comparabilityGroup: "dxa_regional",
    }),
  };
}
