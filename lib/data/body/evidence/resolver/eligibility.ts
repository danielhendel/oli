/**
 * Base eligibility filtering for Body Composition Evidence Resolver.
 */

import type {
  BodyCompositionConstructId,
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverRationaleCode,
} from "@oli/contracts";
import {
  bodyCompositionEvidenceObservationSchema,
  bodyCompositionMethodToFamily,
} from "@oli/contracts";

import { BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY } from "../metricRegistry";
import type { ResolverChannelDefinition } from "./policy";
import { policyEligibleMetricsForConstruct } from "./policy";
import { parseMeasuredAtMs } from "./recency";

export type EligibilityOutcome =
  | { ok: true; observation: BodyCompositionEvidenceObservation }
  | {
      ok: false;
      observationId: string;
      metricKey: BodyCompositionEvidenceObservation["metricKey"] | null;
      reasonCode: BodyCompositionResolverRationaleCode;
    };

function expectedUnit(
  metricKey: BodyCompositionEvidenceObservation["metricKey"],
): BodyCompositionEvidenceObservation["canonicalUnit"] | null {
  const def = BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY[metricKey];
  return def?.canonicalUnit ?? null;
}

/**
 * Policy-authorized construct eligibility.
 * Soft bridge tags are not required when Dual Score policy authorizes the metric
 * (e.g. ALMI → H3). Tags that explicitly list the construct remain accepted.
 */
export function isConstructPolicyEligible(
  observation: BodyCompositionEvidenceObservation,
  constructId: BodyCompositionConstructId,
): boolean {
  const policyMetrics = policyEligibleMetricsForConstruct(constructId);
  if (!policyMetrics.has(observation.metricKey)) return false;
  // Skeletal muscle is never reinterpreted from lean/FFM.
  if (observation.metricKey === "skeletal_muscle_mass") {
    return constructId === "P1";
  }
  return true;
}

export function evaluateBaseEligibility(
  observation: BodyCompositionEvidenceObservation,
  asOfMs: number,
): EligibilityOutcome {
  const parsed = bodyCompositionEvidenceObservationSchema.safeParse(observation);
  if (!parsed.success) {
    return {
      ok: false,
      observationId: observation.observationId ?? "unknown",
      metricKey: observation.metricKey ?? null,
      reasonCode: "excluded_invalid_value",
    };
  }
  const obs = parsed.data;

  if (!(obs.metricKey in BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY)) {
    return {
      ok: false,
      observationId: obs.observationId,
      metricKey: obs.metricKey,
      reasonCode: "excluded_unknown_metric",
    };
  }

  if (!Number.isFinite(obs.value)) {
    return {
      ok: false,
      observationId: obs.observationId,
      metricKey: obs.metricKey,
      reasonCode: "excluded_invalid_value",
    };
  }

  const unit = expectedUnit(obs.metricKey);
  if (unit && obs.canonicalUnit !== unit) {
    return {
      ok: false,
      observationId: obs.observationId,
      metricKey: obs.metricKey,
      reasonCode: "excluded_invalid_unit",
    };
  }

  const measuredMs = parseMeasuredAtMs(obs.measuredAt);
  if (measuredMs == null) {
    return {
      ok: false,
      observationId: obs.observationId,
      metricKey: obs.metricKey,
      reasonCode: "excluded_missing_measured_at",
    };
  }
  if (measuredMs > asOfMs) {
    return {
      ok: false,
      observationId: obs.observationId,
      metricKey: obs.metricKey,
      reasonCode: "excluded_future_measurement",
    };
  }

  if (obs.evidenceType === "calculated") {
    if (!obs.provenance.formulaVersion) {
      return {
        ok: false,
        observationId: obs.observationId,
        metricKey: obs.metricKey,
        reasonCode: "excluded_missing_formula_provenance",
      };
    }
    if (!obs.provenance.inputObservationRefs?.length) {
      return {
        ok: false,
        observationId: obs.observationId,
        metricKey: obs.metricKey,
        reasonCode: "excluded_missing_formula_provenance",
      };
    }
  }

  return { ok: true, observation: obs };
}

export function matchesChannel(
  observation: BodyCompositionEvidenceObservation,
  channel: ResolverChannelDefinition,
  bundle: BodyCompositionEvidenceBundle,
): { ok: true } | { ok: false; reasonCode: BodyCompositionResolverRationaleCode } {
  if (!channel.metricKeys.includes(observation.metricKey)) {
    return { ok: false, reasonCode: "excluded_construct_ineligible" };
  }

  if (channel.requireTotalRegion) {
    if (observation.region !== "total" && observation.region !== null) {
      return { ok: false, reasonCode: "excluded_unsupported_region" };
    }
  }

  if (channel.requireLimbRegion) {
    const limbs = new Set(["left_arm", "right_arm", "left_leg", "right_leg", "arms", "legs"]);
    if (!observation.region || !limbs.has(observation.region)) {
      return { ok: false, reasonCode: "excluded_unsupported_region" };
    }
  }

  if (channel.allowedRegions) {
    const allowed = new Set(channel.allowedRegions);
    if (!allowed.has(observation.region)) {
      return { ok: false, reasonCode: "excluded_unsupported_region" };
    }
  }

  if (channel.requiresStandardizedWaistProtocol) {
    const protocolOk = hasStandardizedWaistProtocol(observation, bundle);
    if (!protocolOk) {
      return { ok: false, reasonCode: "excluded_unknown_protocol_for_standardized_primary" };
    }
  }

  return { ok: true };
}

/**
 * WHtR standardized path: waist input observation must carry who_midpoint_v1.
 * Calculated WHtR itself does not invent protocol.
 */
export function hasStandardizedWaistProtocol(
  observation: BodyCompositionEvidenceObservation,
  bundle: BodyCompositionEvidenceBundle,
): boolean {
  if (observation.metricKey === "waist_circumference") {
    return observation.provenance.protocolId === "who_midpoint_v1";
  }
  if (observation.metricKey === "whtr") {
    const refs = observation.provenance.inputObservationRefs ?? [];
    for (const ref of refs) {
      const input = bundle.observations.find((o) => o.observationId === ref);
      if (input?.metricKey === "waist_circumference") {
        return input.provenance.protocolId === "who_midpoint_v1";
      }
    }
    // No waist input found with WHO protocol → fail closed.
    return false;
  }
  return false;
}

export function methodFamilyOf(observation: BodyCompositionEvidenceObservation) {
  return bodyCompositionMethodToFamily(
    observation.source.measurementMethod,
    observation.evidenceType,
  );
}
