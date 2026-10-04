/**
 * Read Resolver channel / observation authority for score constructs.
 * Never invents precedence, never searches for a "better" value.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverChannelResult,
  BodyCompositionResolverConstructResult,
  BodyCompositionResolverConstructStatus,
} from "@oli/contracts";

import {
  ALMI_CHANNEL_ID,
  ALMI_FORMULA_VERSION,
  FFMI_CHANNEL_ID,
  FFMI_FORMULA_VERSION,
  FMI_CHANNEL_ID,
  FMI_FORMULA_VERSION,
  H1_WHTR_CHANNEL_ID,
  WHO_MIDPOINT_PROTOCOL_ID,
  WHO_MIDPOINT_PROTOCOL_VERSION,
  WHTR_FORMULA_VERSION,
} from "./constants";

const RESOLVED: ReadonlySet<BodyCompositionResolverConstructStatus> = new Set([
  "resolved",
  "resolved_with_supporting",
]);

export function observationMap(
  bundle: BodyCompositionEvidenceBundle,
): Map<string, BodyCompositionEvidenceObservation> {
  const map = new Map<string, BodyCompositionEvidenceObservation>();
  for (const obs of bundle.observations) {
    map.set(obs.observationId, obs);
  }
  return map;
}

export function findConstruct(
  constructs: readonly BodyCompositionResolverConstructResult[],
  constructId: string,
): BodyCompositionResolverConstructResult | null {
  return constructs.find((c) => c.constructId === constructId) ?? null;
}

export function findChannel(
  construct: BodyCompositionResolverConstructResult,
  channelId: string,
): BodyCompositionResolverChannelResult | null {
  return construct.channels.find((c) => c.channelId === channelId) ?? null;
}

export function isChannelResolved(
  channel: BodyCompositionResolverChannelResult | null,
): channel is BodyCompositionResolverChannelResult {
  return channel != null && RESOLVED.has(channel.status);
}

export type GovernedMetricChannel = {
  channel: BodyCompositionResolverChannelResult;
  observation: BodyCompositionEvidenceObservation;
};

/**
 * H1 §10.2: score only when WHtR channel itself is resolved / resolved_with_supporting.
 * Construct may still be multiple_valid when VAT is complementary.
 */
export function governedH1WhtrChannel(
  construct: BodyCompositionResolverConstructResult,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): GovernedMetricChannel | null {
  const channel = findChannel(construct, H1_WHTR_CHANNEL_ID);
  if (!isChannelResolved(channel)) return null;
  const ref = channel.primaryEvidenceRefs[0];
  if (!ref) return null;
  const observation = byId.get(ref);
  if (!observation) return null;
  return { channel, observation };
}

/**
 * DXA FMI channel when resolved (H2 / P3).
 */
export function governedFmiChannel(
  construct: BodyCompositionResolverConstructResult,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): GovernedMetricChannel | null {
  const channel = findChannel(construct, FMI_CHANNEL_ID);
  if (!isChannelResolved(channel)) return null;
  const ref = channel.primaryEvidenceRefs[0];
  if (!ref) return null;
  const observation = byId.get(ref);
  if (!observation) return null;
  return { channel, observation };
}

/**
 * H3: consume Resolver PRIMARY only (§12.1).
 *
 * Canonical primary representation: `construct.primaryEvidenceRefs[0]` from the
 * approved Resolver construct result. Score ALMI/FFMI only when that primary
 * observation is ALMI/FFMI and the matching channel is resolved.
 *
 * Never search later refs and never invent lean-channel precedence.
 */
export function governedH3LeanChannel(
  construct: BodyCompositionResolverConstructResult,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): (GovernedMetricChannel & { kind: "almi" | "ffmi" }) | null {
  if (!RESOLVED.has(construct.status)) return null;

  const primaryRef = construct.primaryEvidenceRefs[0];
  if (!primaryRef) return null;
  const primaryObs = byId.get(primaryRef);
  if (!primaryObs) return null;

  if (primaryObs.metricKey === "almi") {
    const almi = findChannel(construct, ALMI_CHANNEL_ID);
    if (!isChannelResolved(almi)) return null;
    return { channel: almi, observation: primaryObs, kind: "almi" };
  }
  if (primaryObs.metricKey === "ffmi") {
    const ffmi = findChannel(construct, FFMI_CHANNEL_ID);
    if (!isChannelResolved(ffmi)) return null;
    return { channel: ffmi, observation: primaryObs, kind: "ffmi" };
  }
  return null;
}

/**
 * P1: DXA FFMI channel must itself be resolved / resolved_with_supporting.
 */
export function governedP1FfmiChannel(
  construct: BodyCompositionResolverConstructResult,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): GovernedMetricChannel | null {
  const channel = findChannel(construct, FFMI_CHANNEL_ID);
  if (!isChannelResolved(channel)) return null;
  const ref = channel.primaryEvidenceRefs[0];
  if (!ref) return null;
  const observation = byId.get(ref);
  if (!observation || observation.metricKey !== "ffmi") return null;
  return { channel, observation };
}

export function heightObservationFromIndex(
  indexObs: BodyCompositionEvidenceObservation,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): BodyCompositionEvidenceObservation | null {
  const refs = indexObs.provenance.inputObservationRefs ?? [];
  for (const ref of refs) {
    const obs = byId.get(ref);
    if (obs?.metricKey === "height") return obs;
  }
  return null;
}

export function waistObservationFromWhtr(
  whtrObs: BodyCompositionEvidenceObservation,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): BodyCompositionEvidenceObservation | null {
  const refs = whtrObs.provenance.inputObservationRefs ?? [];
  for (const ref of refs) {
    const obs = byId.get(ref);
    if (obs?.metricKey === "waist_circumference") return obs;
  }
  return null;
}

export function isValidWhtrObservation(obs: BodyCompositionEvidenceObservation): boolean {
  return (
    obs.metricKey === "whtr" &&
    obs.provenance.formulaVersion === WHTR_FORMULA_VERSION &&
    Number.isFinite(obs.value)
  );
}

export function isValidWhoWaist(obs: BodyCompositionEvidenceObservation): boolean {
  return (
    obs.metricKey === "waist_circumference" &&
    obs.provenance.protocolId === WHO_MIDPOINT_PROTOCOL_ID &&
    obs.provenance.protocolVersion === WHO_MIDPOINT_PROTOCOL_VERSION
  );
}

export function isValidDxaFmi(obs: BodyCompositionEvidenceObservation): boolean {
  return (
    obs.metricKey === "fmi" &&
    obs.provenance.formulaVersion === FMI_FORMULA_VERSION &&
    obs.source.measurementMethod === "dxa" &&
    Number.isFinite(obs.value)
  );
}

export function isValidDxaFfmi(obs: BodyCompositionEvidenceObservation): boolean {
  return (
    obs.metricKey === "ffmi" &&
    obs.provenance.formulaVersion === FFMI_FORMULA_VERSION &&
    obs.source.measurementMethod === "dxa" &&
    Number.isFinite(obs.value)
  );
}

export function isValidDxaAlmi(obs: BodyCompositionEvidenceObservation): boolean {
  return (
    obs.metricKey === "almi" &&
    obs.provenance.formulaVersion === ALMI_FORMULA_VERSION &&
    obs.source.measurementMethod === "dxa" &&
    Number.isFinite(obs.value)
  );
}

/**
 * For calculated DXA indices, method on the calculated observation may be "other".
 * Prefer source method of a measured composition input when present; else require
 * DXA on any measured composition input in provenance, or measurementMethod dxa.
 */
export function indexMeasurementMethod(
  indexObs: BodyCompositionEvidenceObservation,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): BodyCompositionEvidenceObservation["source"]["measurementMethod"] {
  if (indexObs.source.measurementMethod === "dxa") return "dxa";
  const refs = indexObs.provenance.inputObservationRefs ?? [];
  for (const ref of refs) {
    const obs = byId.get(ref);
    if (!obs) continue;
    if (
      obs.metricKey === "fat_mass" ||
      obs.metricKey === "fat_free_mass" ||
      obs.metricKey === "lean_mass" ||
      obs.metricKey === "fat_percent"
    ) {
      return obs.source.measurementMethod;
    }
  }
  // Limb lean for ALMI
  for (const ref of refs) {
    const obs = byId.get(ref);
    if (obs?.metricKey === "lean_mass") return obs.source.measurementMethod;
  }
  return indexObs.source.measurementMethod;
}
