/**
 * buildBodyCompositionEvidenceBundle — pure Canonical Evidence Bridge.
 *
 * SOURCE FACTS → adapters → canonical observations (no selection, no score).
 * Completeness is always caller_supplied_partial — the bridge does not prove
 * account-wide enumeration.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceCompleteness,
  BodyCompositionEvidenceInvalidReason,
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceSourcePresence,
  BodyScanDetailDto,
  UserProfileMain,
} from "@oli/contracts";
import { bodyCompositionEvidenceBundleSchema } from "@oli/contracts";

import { adaptVerifiedBodyScanEvidenceMany } from "./bodyScanEvidenceAdapter";
import {
  adaptContinuousBodyEvidenceEvents,
  type ContinuousBodyEvidenceEventInput,
} from "./continuousEvidenceAdapter";
import { adaptProfileAnthropometryEvidence } from "./profileAnthropometryAdapter";
import { buildBodyCompositionSubjectContext } from "./subjectContext";

export type BuildBodyCompositionEvidenceBundleInput = {
  /**
   * Omitted (`undefined`) vs `[]` vs nonempty are recorded in completeness.
   * Do not default before presence is recorded.
   */
  continuousEvents?: readonly ContinuousBodyEvidenceEventInput[];
  verifiedBodyScans?: readonly BodyScanDetailDto[];
  /** Candidate drafts must never be passed here; excluded if status ≠ verified. */
  profile?: UserProfileMain | null;
  profileEffectiveAt?: string | null;
};

export function sourceArrayPresence(
  value: readonly unknown[] | undefined,
): BodyCompositionEvidenceSourcePresence {
  if (value === undefined) return "omitted";
  if (value.length === 0) return "provided_empty";
  return "provided_nonempty";
}

export function buildEvidenceCompleteness(args: {
  profile: UserProfileMain | null | undefined;
  continuousEvents: readonly unknown[] | undefined;
  verifiedBodyScans: readonly unknown[] | undefined;
}): BodyCompositionEvidenceCompleteness {
  return {
    mode: "caller_supplied_partial",
    profile: args.profile != null ? "available" : "missing",
    continuousEvents: sourceArrayPresence(args.continuousEvents),
    verifiedScanDetails: sourceArrayPresence(args.verifiedBodyScans),
  };
}

function compareObservations(
  a: BodyCompositionEvidenceObservation,
  b: BodyCompositionEvidenceObservation,
): number {
  if (a.measuredAt !== b.measuredAt) return a.measuredAt < b.measuredAt ? -1 : 1;
  if (a.metricKey !== b.metricKey) return a.metricKey < b.metricKey ? -1 : 1;
  const ar = a.region ?? "";
  const br = b.region ?? "";
  if (ar !== br) return ar < br ? -1 : 1;
  const as = a.source.sourceSystem;
  const bs = b.source.sourceSystem;
  if (as !== bs) return as < bs ? -1 : 1;
  if (a.observationId !== b.observationId) return a.observationId < b.observationId ? -1 : 1;
  return 0;
}

function dedupeByObservationId(
  observations: readonly BodyCompositionEvidenceObservation[],
): BodyCompositionEvidenceObservation[] {
  const seen = new Set<string>();
  const out: BodyCompositionEvidenceObservation[] = [];
  for (const obs of observations) {
    if (seen.has(obs.observationId)) continue;
    seen.add(obs.observationId);
    out.push(obs);
  }
  return out;
}

/**
 * Build the canonical evidence bundle from governed source inputs.
 * Does not average, rank, or select winners. Does not calculate indices.
 * Does not claim account-complete coverage.
 */
export function buildBodyCompositionEvidenceBundle(
  input: BuildBodyCompositionEvidenceBundleInput,
): BodyCompositionEvidenceBundle {
  const continuousEvents = input.continuousEvents;
  const verifiedBodyScans = input.verifiedBodyScans;
  const completeness = buildEvidenceCompleteness({
    profile: input.profile,
    continuousEvents,
    verifiedBodyScans,
  });

  const invalidReasons: BodyCompositionEvidenceInvalidReason[] = [];
  const subjectContext = buildBodyCompositionSubjectContext({
    profile: input.profile ?? null,
    profileEffectiveAt: input.profileEffectiveAt ?? null,
  });

  const continuous = adaptContinuousBodyEvidenceEvents(continuousEvents ?? []);
  const scans = adaptVerifiedBodyScanEvidenceMany(verifiedBodyScans ?? []);
  const profileAnthro = adaptProfileAnthropometryEvidence(subjectContext);

  invalidReasons.push(
    ...continuous.invalidReasons,
    ...scans.invalidReasons,
    ...profileAnthro.invalidReasons,
  );

  const observations = dedupeByObservationId([
    ...continuous.observations,
    ...scans.observations,
    ...profileAnthro.observations,
  ])
    .map((obs) =>
      obs.source.sourceSystem === "body_scan" && obs.continuousTrendEligible
        ? { ...obs, continuousTrendEligible: false }
        : obs,
    )
    .sort(compareObservations);

  const uniqueReasons = [...new Set(invalidReasons)];
  const bundle: BodyCompositionEvidenceBundle = {
    schemaVersion: 1,
    subjectContext,
    observations,
    diagnostics: {
      invalidCount: invalidReasons.length,
      reasons: uniqueReasons,
    },
    completeness,
  };

  return bodyCompositionEvidenceBundleSchema.parse(bundle);
}
