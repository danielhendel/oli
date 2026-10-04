/**
 * Governed calculated-metric → formulaVersion + input contracts.
 * Resolver never invents, searches for, or recalculates missing inputs.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceMetricKey,
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverRationaleCode,
} from "@oli/contracts";

import {
  ALMI_FORMULA_VERSION,
  BMI_FORMULA_VERSION,
  FFMI_FORMULA_VERSION,
  FMI_FORMULA_VERSION,
  WHTR_FORMULA_VERSION,
} from "../formulas";
import { parseMeasuredAtMs } from "./recency";

const LIMB_REGIONS = new Set(["left_arm", "right_arm", "left_leg", "right_leg"]);

export type FormulaInputRole = "height" | "body_mass" | "waist" | "fat_mass" | "fat_free_mass" | "appendicular_lean";

export type CalculatedFormulaContract = {
  metricKey: BodyCompositionEvidenceMetricKey;
  formulaVersion: string;
  /** Required semantic roles; order independent. */
  requiredRoles: readonly FormulaInputRole[];
};

export const CALCULATED_FORMULA_REGISTRY: Readonly<
  Record<string, CalculatedFormulaContract>
> = {
  bmi: {
    metricKey: "bmi",
    formulaVersion: BMI_FORMULA_VERSION,
    requiredRoles: ["body_mass", "height"],
  },
  whtr: {
    metricKey: "whtr",
    formulaVersion: WHTR_FORMULA_VERSION,
    requiredRoles: ["waist", "height"],
  },
  fmi: {
    metricKey: "fmi",
    formulaVersion: FMI_FORMULA_VERSION,
    requiredRoles: ["fat_mass", "height"],
  },
  ffmi: {
    metricKey: "ffmi",
    formulaVersion: FFMI_FORMULA_VERSION,
    requiredRoles: ["fat_free_mass", "height"],
  },
  almi: {
    metricKey: "almi",
    formulaVersion: ALMI_FORMULA_VERSION,
    requiredRoles: ["appendicular_lean", "height"],
  },
};

function roleOfInput(
  input: BodyCompositionEvidenceObservation,
  forMetric: BodyCompositionEvidenceMetricKey,
): FormulaInputRole | null {
  if (input.metricKey === "height") return "height";
  if (input.metricKey === "body_mass" || input.metricKey === "total_mass") return "body_mass";
  if (input.metricKey === "waist_circumference") return "waist";
  if (input.metricKey === "fat_mass" && (input.region === "total" || input.region === null)) {
    return "fat_mass";
  }
  if (input.metricKey === "fat_free_mass" && (input.region === "total" || input.region === null)) {
    return "fat_free_mass";
  }
  if (
    forMetric === "almi" &&
    input.metricKey === "lean_mass" &&
    input.region != null &&
    LIMB_REGIONS.has(input.region)
  ) {
    return "appendicular_lean";
  }
  return null;
}

/**
 * Validate calculated observation formula version + full input-ref resolution.
 * Does not mutate the bundle. Does not search for missing inputs.
 */
export function validateCalculatedProvenance(args: {
  observation: BodyCompositionEvidenceObservation;
  bundle: BodyCompositionEvidenceBundle;
  asOfMs: number;
}): { ok: true } | { ok: false; reasonCode: BodyCompositionResolverRationaleCode } {
  const obs = args.observation;
  if (obs.evidenceType !== "calculated") return { ok: true };

  const contract = CALCULATED_FORMULA_REGISTRY[obs.metricKey];
  if (!contract) {
    // Calculated metric without a governed formula contract — fail closed.
    return { ok: false, reasonCode: "excluded_unsupported_formula_version" };
  }

  if (!obs.provenance.formulaVersion) {
    return { ok: false, reasonCode: "excluded_missing_formula_provenance" };
  }
  if (obs.provenance.formulaVersion !== contract.formulaVersion) {
    return { ok: false, reasonCode: "excluded_unsupported_formula_version" };
  }

  const refs = obs.provenance.inputObservationRefs ?? [];
  if (refs.length === 0) {
    return { ok: false, reasonCode: "excluded_missing_formula_input" };
  }

  const seen = new Set<string>();
  for (const ref of refs) {
    if (seen.has(ref)) {
      return { ok: false, reasonCode: "excluded_duplicate_formula_input_ref" };
    }
    seen.add(ref);
    if (ref === obs.observationId) {
      return { ok: false, reasonCode: "excluded_formula_input_cycle" };
    }
  }

  const byId = new Map(args.bundle.observations.map((o) => [o.observationId, o]));
  const resolved: BodyCompositionEvidenceObservation[] = [];
  for (const ref of refs) {
    const input = byId.get(ref);
    if (!input) {
      return { ok: false, reasonCode: "excluded_dangling_input_ref" };
    }
    const inputMs = parseMeasuredAtMs(input.measuredAt);
    if (inputMs == null) {
      return { ok: false, reasonCode: "excluded_missing_measured_at" };
    }
    if (inputMs > args.asOfMs) {
      return { ok: false, reasonCode: "excluded_future_measurement" };
    }
    resolved.push(input);
  }

  const rolesFound = new Map<FormulaInputRole, BodyCompositionEvidenceObservation[]>();
  for (const input of resolved) {
    const role = roleOfInput(input, obs.metricKey);
    if (!role) {
      return { ok: false, reasonCode: "excluded_wrong_formula_input_metric" };
    }
    const list = rolesFound.get(role) ?? [];
    list.push(input);
    rolesFound.set(role, list);
  }

  for (const role of contract.requiredRoles) {
    const found = rolesFound.get(role) ?? [];
    if (role === "height") {
      if (found.length !== 1) {
        return { ok: false, reasonCode: "excluded_missing_height_provenance" };
      }
      continue;
    }
    if (role === "appendicular_lean") {
      // At least two distinct limb regions — never total lean, never a single limb alone.
      const regions = new Set(found.map((o) => o.region).filter(Boolean));
      if (found.length < 2 || regions.size < 2) {
        return { ok: false, reasonCode: "excluded_missing_formula_input" };
      }
      continue;
    }
    if (found.length !== 1) {
      return { ok: false, reasonCode: "excluded_missing_formula_input" };
    }
  }

  // Reject unexpected extra roles beyond the contract.
  for (const role of rolesFound.keys()) {
    if (!contract.requiredRoles.includes(role)) {
      return { ok: false, reasonCode: "excluded_wrong_formula_input_metric" };
    }
  }

  return { ok: true };
}

/**
 * Standardized WHtR channel: WHO midpoint Waist (v1) + governed Height refs.
 */
export function hasStandardizedWhtrProvenance(
  observation: BodyCompositionEvidenceObservation,
  bundle: BodyCompositionEvidenceBundle,
): boolean {
  if (observation.metricKey !== "whtr") return false;
  if (observation.provenance.formulaVersion !== WHTR_FORMULA_VERSION) return false;
  const refs = observation.provenance.inputObservationRefs ?? [];
  const byId = new Map(bundle.observations.map((o) => [o.observationId, o]));
  let waist: BodyCompositionEvidenceObservation | null = null;
  let height: BodyCompositionEvidenceObservation | null = null;
  for (const ref of refs) {
    const input = byId.get(ref);
    if (!input) return false;
    if (input.metricKey === "waist_circumference") waist = input;
    if (input.metricKey === "height") height = input;
  }
  if (!waist || !height) return false;
  if (waist.provenance.protocolId !== "who_midpoint_v1") return false;
  if (waist.provenance.protocolVersion !== 1) return false;
  return true;
}
