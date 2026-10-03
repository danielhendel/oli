/**
 * Deterministic representative selection inside comparable sets.
 * Same-day DXA vs consumer/segmental BIA: DXA primary; BIA retained as supporting.
 */

import type {
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverConstructStatus,
  BodyCompositionResolverRationaleCode,
} from "@oli/contracts";

import { compareCandidatesDeterministic, groupIntoComparableSets } from "./comparability";
import { methodFamilyOf } from "./eligibility";
import { utcDayKey } from "./recency";

export type ChannelSelection = {
  status: BodyCompositionResolverConstructStatus;
  primaryEvidenceRefs: string[];
  supportingEvidenceRefs: string[];
  alternateEvidenceRefs: string[];
  rationaleCodes: BodyCompositionResolverRationaleCode[];
  primaryObservation: BodyCompositionEvidenceObservation | null;
};

const BIA_FAMILIES = new Set(["consumer_bia", "segmental_bia"]);

function dedupeRefs(refs: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of refs) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sortRefs(refs: readonly string[]): string[] {
  return [...refs].sort((a, b) => a.localeCompare(b));
}

/**
 * Pick representatives for one channel's eligible observations.
 */
export function selectChannelRepresentatives(
  eligible: readonly BodyCompositionEvidenceObservation[],
): ChannelSelection {
  if (eligible.length === 0) {
    return {
      status: "insufficient",
      primaryEvidenceRefs: [],
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: [],
      rationaleCodes: ["insufficient_required_inputs"],
      primaryObservation: null,
    };
  }

  const byId = new Map(eligible.map((o) => [o.observationId, o]));
  const sets = groupIntoComparableSets(eligible);

  // Newest per comparable family.
  const familyReps: BodyCompositionEvidenceObservation[] = [];
  const olderAlternates: string[] = [];
  for (const [, list] of [...sets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [newest, ...rest] = list;
    if (newest) familyReps.push(newest);
    for (const older of rest) olderAlternates.push(older.observationId);
  }
  familyReps.sort(compareCandidatesDeterministic);

  if (familyReps.length === 1) {
    const only = familyReps[0]!;
    return {
      status: "resolved",
      primaryEvidenceRefs: [only.observationId],
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: sortRefs(olderAlternates),
      rationaleCodes:
        eligible.length === 1
          ? ["selected_only_eligible_candidate"]
          : ["selected_newest_within_comparable_family"],
      primaryObservation: only,
    };
  }

  // Same-day DXA vs BIA on matching metric/region/unit (across method families).
  const sameDayConflict = applySameDayDxaPrecedence(familyReps);
  if (sameDayConflict) {
    return {
      status: "resolved_with_supporting",
      primaryEvidenceRefs: [sameDayConflict.primary.observationId],
      supportingEvidenceRefs: sortRefs(sameDayConflict.supporting.map((o) => o.observationId)),
      alternateEvidenceRefs: sortRefs([
        ...olderAlternates,
        ...sameDayConflict.alternates.map((o) => o.observationId),
      ]),
      rationaleCodes: [
        "selected_verified_dxa_same_day_precedence",
        "retained_supporting_different_method",
      ],
      primaryObservation: sameDayConflict.primary,
    };
  }

  // Different-day / multi-method: no frozen global cross-method winner.
  const primaryRefs = sortRefs(familyReps.map((o) => o.observationId));
  return {
    status: "multiple_valid",
    primaryEvidenceRefs: primaryRefs,
    supportingEvidenceRefs: [],
    alternateEvidenceRefs: sortRefs(olderAlternates),
    rationaleCodes: ["multiple_valid_no_frozen_precedence", "not_comparable_different_method"],
    primaryObservation: byId.get(primaryRefs[0]!) ?? familyReps[0]!,
  };
}

function applySameDayDxaPrecedence(
  familyReps: readonly BodyCompositionEvidenceObservation[],
): {
  primary: BodyCompositionEvidenceObservation;
  supporting: BodyCompositionEvidenceObservation[];
  alternates: BodyCompositionEvidenceObservation[];
} | null {
  // Group by semantic quantity (metric+region+unit) and UTC day.
  type Bucket = {
    dxa: BodyCompositionEvidenceObservation[];
    bia: BodyCompositionEvidenceObservation[];
    other: BodyCompositionEvidenceObservation[];
  };
  const buckets = new Map<string, Bucket>();

  for (const obs of familyReps) {
    const day = utcDayKey(obs.measuredAt);
    if (!day) continue;
    const key = `${obs.metricKey}|${obs.region ?? "null"}|${obs.canonicalUnit}|${day}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { dxa: [], bia: [], other: [] };
      buckets.set(key, bucket);
    }
    const family = methodFamilyOf(obs);
    if (family === "dxa") bucket.dxa.push(obs);
    else if (BIA_FAMILIES.has(family)) bucket.bia.push(obs);
    else bucket.other.push(obs);
  }

  for (const [, bucket] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (bucket.dxa.length > 0 && bucket.bia.length > 0) {
      bucket.dxa.sort(compareCandidatesDeterministic);
      bucket.bia.sort(compareCandidatesDeterministic);
      const primary = bucket.dxa[0]!;
      const supporting = [...bucket.bia, ...bucket.dxa.slice(1)];
      const used = new Set([primary.observationId, ...supporting.map((o) => o.observationId)]);
      const alternates = familyReps.filter((o) => !used.has(o.observationId));
      return { primary, supporting, alternates };
    }
  }
  return null;
}

export function mergeUniqueRefs(...groups: readonly (readonly string[])[]): string[] {
  return sortRefs(dedupeRefs(groups.flat()));
}
