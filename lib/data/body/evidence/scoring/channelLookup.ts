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
 * H3: consume Resolver primary channel — ALMI or FFMI only when that channel is resolved.
 * Do not implement ALMI>FFMI selection here.
 */
export function governedH3LeanChannel(
  construct: BodyCompositionResolverConstructResult,
  byId: Map<string, BodyCompositionEvidenceObservation>,
): (GovernedMetricChannel & { kind: "almi" | "ffmi" }) | null {
  if (!RESOLVED.has(construct.status)) {
    // Only resolved construct statuses expose a primary lean channel for scoring.
    // (Channel may still be inspected for fail-closed reasons elsewhere.)
  }
  const almi = findChannel(construct, ALMI_CHANNEL_ID);
  const ffmi = findChannel(construct, FFMI_CHANNEL_ID);

  // Prefer reading Resolver primary refs: if primary obs is ALMI/FFMI and matching channel resolved.
  const primaryRef = construct.primaryEvidenceRefs[0];
  if (primaryRef && RESOLVED.has(construct.status)) {
    const primaryObs = byId.get(primaryRef);
    if (primaryObs?.metricKey === "almi" && isChannelResolved(almi)) {
      return { channel: almi, observation: primaryObs, kind: "almi" };
    }
    if (primaryObs?.metricKey === "ffmi" && isChannelResolved(ffmi)) {
      return { channel: ffmi, observation: primaryObs, kind: "ffmi" };
    }
  }

  // If construct resolved_with_supporting / resolved but primary ref missing metric match,
  // use the resolved frozen primary channel only when uniquely indicated by channel status
  // and construct primaryEvidenceRefs already point there — do not invent ALMI>FFMI.
  if (RESOLVED.has(construct.status) && isChannelResolved(almi) && almi.primaryEvidenceRefs[0]) {
    const obs = byId.get(almi.primaryEvidenceRefs[0]);
    if (obs?.metricKey === "almi" && construct.primaryEvidenceRefs.includes(obs.observationId)) {
      return { channel: almi, observation: obs, kind: "almi" };
    }
  }
  if (RESOLVED.has(construct.status) && isChannelResolved(ffmi) && ffmi.primaryEvidenceRefs[0]) {
    const obs = byId.get(ffmi.primaryEvidenceRefs[0]);
    if (obs?.metricKey === "ffmi" && construct.primaryEvidenceRefs.includes(obs.observationId)) {
      return { channel: ffmi, observation: obs, kind: "ffmi" };
    }
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
