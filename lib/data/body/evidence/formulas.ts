/**
 * Deterministic Body Composition index helpers (pure).
 *
 * Callers must supply explicit compatible input observations.
 * The evidence bridge never auto-selects cross-source inputs.
 */

import type { BodyCompositionEvidenceObservation } from "@oli/contracts";

export const BODY_COMPOSITION_FORMULA_VERSION = "bc_indices_v1" as const;

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
      formulaVersion: BODY_COMPOSITION_FORMULA_VERSION,
      inputObservationRefs: [...args.inputRefs],
      corrected: null,
    },
    continuousTrendEligible: false,
    comparabilityGroup: args.comparabilityGroup,
    recencyClass: args.recencyClass,
    constructEligibility: [...args.constructEligibility],
    redundancyGroup: args.redundancyGroup,
  };
}

/** BMI = bodyMassKg / heightM² */
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
      constructEligibility: [],
      redundancyGroup: "none",
      recencyClass: "fast",
      comparabilityGroup: "unknown",
    }),
  };
}

/** WHtR = waistCm / heightCm (compatible length units). */
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
      constructEligibility: ["H1"],
      redundancyGroup: "waist_whtr",
      recencyClass: "moderate",
      comparabilityGroup: "manual_anthropometry",
    }),
  };
}

/** FMI = fatMassKg / heightM² */
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
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.fatMassKg / (heightM * heightM);
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:fmi:${args.inputObservationRefs.join("+")}`,
      metricKey: "fmi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      constructEligibility: ["H2"],
      redundancyGroup: "bf_fat_mass_fmi",
      recencyClass: "moderate",
      comparabilityGroup: "unknown",
    }),
  };
}

/** FFMI = fatFreeMassKg / heightM² — never substitute lean_mass silently. */
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
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.fatFreeMassKg / (heightM * heightM);
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:ffmi:${args.inputObservationRefs.join("+")}`,
      metricKey: "ffmi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
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
  const heightM = args.heightCm / 100;
  if (heightM <= 0) return { ok: false, reason: "invalid_height" };
  const value = args.appendicularLeanMassKg / (heightM * heightM);
  return {
    ok: true,
    observation: calculatedBase({
      observationId: args.observationId ?? `calc:almi:${args.inputObservationRefs.join("+")}`,
      metricKey: "almi",
      value,
      unit: "kg_per_m2",
      measuredAt: args.measuredAt,
      inputRefs: args.inputObservationRefs,
      constructEligibility: ["P2"],
      redundancyGroup: "appendicular_lean_almi",
      recencyClass: "slow",
      comparabilityGroup: "dxa_regional",
    }),
  };
}
