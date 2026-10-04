/**
 * Deterministic representative selection inside comparable sets.
 *
 * Same-day DXA vs BIA precedence is conceptually authorized by the Dual Score
 * freeze but INACTIVE in body_composition_resolver_draft_v1 until a separate
 * measurement-day boundary ADR freezes timezone / calendar rules.
 * UTC is NOT the governed day boundary.
 */

import type {
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverConstructStatus,
  BodyCompositionResolverRationaleCode,
} from "@oli/contracts";

import { compareCandidatesDeterministic, groupIntoComparableSets } from "./comparability";
import { methodFamilyOf } from "./eligibility";

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
 * FUTURE (dormant): once an ADR freezes day timezone + calendar boundary +
 * missing-timezone behavior, same-day matching DXA + BIA may select DXA primary.
 * Do not call until that ADR is accepted. Do not invent UTC / local / 24h rules.
 */
export const SAME_DAY_DXA_PRECEDENCE_ACTIVE_IN_DRAFT_V1 = false as const;

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

  // DXA + BIA for the same semantic quantity: day-boundary policy is not frozen.
  // Preserve both; do not apply UTC (or any) same-day DXA precedence.
  if (hasDxaAndBiaForMatchingQuantity(familyReps)) {
    const primaryRefs = sortRefs(familyReps.map((o) => o.observationId));
    return {
      status: "policy_not_frozen",
      primaryEvidenceRefs: primaryRefs,
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: sortRefs(olderAlternates),
      rationaleCodes: [
        "same_day_boundary_not_frozen",
        "same_day_precedence_not_applied",
        "policy_not_frozen",
        "not_comparable_different_method",
      ],
      primaryObservation: byId.get(primaryRefs[0]!) ?? familyReps[0]!,
    };
  }

  // Other multi-method / multi-family: no frozen global winner.
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

function hasDxaAndBiaForMatchingQuantity(
  familyReps: readonly BodyCompositionEvidenceObservation[],
): boolean {
  // Group by semantic quantity only (metric+region+unit) — NOT by calendar day.
  const buckets = new Map<string, { hasDxa: boolean; hasBia: boolean }>();
  for (const obs of familyReps) {
    const key = `${obs.metricKey}|${obs.region ?? "null"}|${obs.canonicalUnit}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { hasDxa: false, hasBia: false };
      buckets.set(key, bucket);
    }
    const family = methodFamilyOf(obs);
    if (family === "dxa") bucket.hasDxa = true;
    if (BIA_FAMILIES.has(family)) bucket.hasBia = true;
  }
  for (const bucket of buckets.values()) {
    if (bucket.hasDxa && bucket.hasBia) return true;
  }
  return false;
}

export function mergeUniqueRefs(...groups: readonly (readonly string[])[]): string[] {
  return sortRefs(dedupeRefs(groups.flat()));
}
