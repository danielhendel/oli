/**
 * Deterministic comparable-set construction.
 *
 * Explicitly not comparable across semantic boundaries
 * (Lean≠FFM≠SMM, VAT mass≠volume, BF%≠Fat Mass, BMC≠BMD, etc.).
 */

import type {
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverMethodFamily,
} from "@oli/contracts";

import { methodFamilyOf } from "./eligibility";
import { parseMeasuredAtMs } from "./recency";

export type ComparableKey = {
  metricKey: BodyCompositionEvidenceObservation["metricKey"];
  region: BodyCompositionEvidenceObservation["region"];
  unit: BodyCompositionEvidenceObservation["canonicalUnit"];
  methodFamily: BodyCompositionResolverMethodFamily;
  formulaVersion: string | null;
};

export function comparableKeyOf(observation: BodyCompositionEvidenceObservation): ComparableKey {
  const family = methodFamilyOf(observation);
  const formulaVersion =
    observation.evidenceType === "calculated"
      ? observation.provenance.formulaVersion ?? null
      : null;
  return {
    metricKey: observation.metricKey,
    region: observation.region,
    unit: observation.canonicalUnit,
    methodFamily: family,
    formulaVersion,
  };
}

export function comparableKeyString(key: ComparableKey): string {
  return [
    key.metricKey,
    key.region ?? "null",
    key.unit,
    key.methodFamily,
    key.formulaVersion ?? "none",
  ].join("|");
}

export function areDirectlyComparable(
  a: BodyCompositionEvidenceObservation,
  b: BodyCompositionEvidenceObservation,
): boolean {
  return comparableKeyString(comparableKeyOf(a)) === comparableKeyString(comparableKeyOf(b));
}

/**
 * Stable ordering independent of input-array order.
 * Never sorts by healthiest / lowest BF / highest lean.
 */
export function compareCandidatesDeterministic(
  a: BodyCompositionEvidenceObservation,
  b: BodyCompositionEvidenceObservation,
): number {
  const aMs = parseMeasuredAtMs(a.measuredAt) ?? Number.NEGATIVE_INFINITY;
  const bMs = parseMeasuredAtMs(b.measuredAt) ?? Number.NEGATIVE_INFINITY;
  if (aMs !== bMs) return bMs - aMs; // newer first

  // Frozen method precedence only where authorized at selection layer;
  // here lexical method-family then observationId for stability.
  const fam = methodFamilyOf(a).localeCompare(methodFamilyOf(b));
  if (fam !== 0) return fam;

  const typeRank = (t: BodyCompositionEvidenceObservation["evidenceType"]) =>
    t === "measured" ? 0 : t === "calculated" ? 1 : 2;
  const tr = typeRank(a.evidenceType) - typeRank(b.evidenceType);
  if (tr !== 0) return tr;

  return a.observationId.localeCompare(b.observationId);
}

export function groupIntoComparableSets(
  observations: readonly BodyCompositionEvidenceObservation[],
): Map<string, BodyCompositionEvidenceObservation[]> {
  const map = new Map<string, BodyCompositionEvidenceObservation[]>();
  for (const obs of observations) {
    const key = comparableKeyString(comparableKeyOf(obs));
    const list = map.get(key);
    if (list) list.push(obs);
    else map.set(key, [obs]);
  }
  for (const [, list] of map) {
    list.sort(compareCandidatesDeterministic);
  }
  return map;
}
