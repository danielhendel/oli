/**
 * Construct-specific evidence resolution (H1–H4, P1–P3).
 */

import type {
  BodyCompositionConstructId,
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverChannelResult,
  BodyCompositionResolverConstructResult,
  BodyCompositionResolverConstructStatus,
  BodyCompositionResolverExcludedCandidateSummary,
  BodyCompositionResolverRationaleCode,
} from "@oli/contracts";

import { comparableKeyOf } from "./comparability";
import {
  evaluateBaseEligibility,
  isConstructPolicyEligible,
  matchesChannel,
  methodFamilyOf,
} from "./eligibility";
import type { ResolverConstructPolicy } from "./policy";
import { resolverConstructPolicy } from "./policy";
import { buildRecencyMetadata } from "./recency";
import { mergeUniqueRefs, selectChannelRepresentatives } from "./selection";

function uniqueSortedCodes(
  codes: readonly BodyCompositionResolverRationaleCode[],
): BodyCompositionResolverRationaleCode[] {
  return [...new Set(codes)].sort((a, b) => a.localeCompare(b));
}

function rollupStatus(
  channelStatuses: readonly BodyCompositionResolverConstructStatus[],
  mode: ResolverConstructPolicy["channelPrecedenceMode"],
  resolvedChannelCount: number,
): BodyCompositionResolverConstructStatus {
  if (resolvedChannelCount === 0) {
    if (channelStatuses.includes("undated_only")) return "undated_only";
    return "insufficient";
  }
  if (mode === "complementary_multiple_valid" && resolvedChannelCount > 1) {
    return "multiple_valid";
  }
  if (mode === "optional_explanatory") {
    if (resolvedChannelCount > 1) return "resolved_with_supporting";
    return channelStatuses.find((s) => s !== "insufficient") ?? "insufficient";
  }
  if (mode === "frozen_primary_among_channels") {
    const hasSupporting = channelStatuses.some(
      (s) => s === "resolved_with_supporting" || s === "multiple_valid",
    );
    if (resolvedChannelCount > 1 || hasSupporting) return "resolved_with_supporting";
    return "resolved";
  }
  if (resolvedChannelCount === 1) {
    return channelStatuses.find((s) => s !== "insufficient") ?? "resolved";
  }
  return "multiple_valid";
}

export function resolveConstruct(args: {
  constructId: BodyCompositionConstructId;
  bundle: BodyCompositionEvidenceBundle;
  asOfMs: number;
  baseEligible: readonly BodyCompositionEvidenceObservation[];
  baseExclusions: readonly BodyCompositionResolverExcludedCandidateSummary[];
}): BodyCompositionResolverConstructResult {
  const policy = resolverConstructPolicy(args.constructId);
  const excluded: BodyCompositionResolverExcludedCandidateSummary[] = [];
  const rationale: BodyCompositionResolverRationaleCode[] = [];

  // Construct-level policy filter.
  const constructCandidates: BodyCompositionEvidenceObservation[] = [];
  for (const obs of args.baseEligible) {
    if (!isConstructPolicyEligible(obs, args.constructId)) {
      // Only record exclusion when metric is related (avoid noise for unrelated metrics).
      continue;
    }
    constructCandidates.push(obs);
  }

  // Observations that look construct-related via soft tags but fail policy metrics
  // are already skipped; record ineligible related metrics from base exclusions only.

  const channelResults: BodyCompositionResolverChannelResult[] = [];
  const channelById = new Map<string, BodyCompositionResolverChannelResult>();

  for (const channel of policy.channels) {
    const channelEligible: BodyCompositionEvidenceObservation[] = [];
    for (const obs of constructCandidates) {
      const match = matchesChannel(obs, channel, args.bundle);
      if (!match.ok) {
        if (channel.metricKeys.includes(obs.metricKey)) {
          excluded.push({
            observationId: obs.observationId,
            metricKey: obs.metricKey,
            reasonCode: match.reasonCode,
          });
          rationale.push(match.reasonCode);
        }
        continue;
      }
      channelEligible.push(obs);
    }

    const selection = selectChannelRepresentatives(channelEligible);
    if (
      channel.requiresStandardizedWaistProtocol &&
      selection.status !== "insufficient"
    ) {
      selection.rationaleCodes = uniqueSortedCodes([
        ...selection.rationaleCodes,
        "selected_standardized_waist_path",
      ]);
    }

    const channelResult: BodyCompositionResolverChannelResult = {
      channelId: channel.channelId,
      status: selection.status,
      primaryEvidenceRefs: selection.primaryEvidenceRefs,
      supportingEvidenceRefs: selection.supportingEvidenceRefs,
      alternateEvidenceRefs: selection.alternateEvidenceRefs,
      rationaleCodes: uniqueSortedCodes(selection.rationaleCodes),
    };
    channelResults.push(channelResult);
    channelById.set(channel.channelId, channelResult);
  }

  // Apply frozen cross-channel precedence when authorized.
  let primaryEvidenceRefs: string[] = [];
  let supportingEvidenceRefs: string[] = [];
  let alternateEvidenceRefs: string[] = [];
  const activeChannels = channelResults.filter((c) => c.status !== "insufficient");

  if (
    policy.channelPrecedenceMode === "frozen_primary_among_channels" &&
    policy.frozenChannelPrecedence.length > 0
  ) {
    let chosen: BodyCompositionResolverChannelResult | null = null;
    for (const channelId of policy.frozenChannelPrecedence) {
      const ch = channelById.get(channelId);
      if (ch && ch.status !== "insufficient" && ch.primaryEvidenceRefs.length > 0) {
        chosen = ch;
        break;
      }
    }
    if (chosen) {
      primaryEvidenceRefs = [...chosen.primaryEvidenceRefs];
      supportingEvidenceRefs = [...chosen.supportingEvidenceRefs];
      alternateEvidenceRefs = [...chosen.alternateEvidenceRefs];
      rationale.push("selected_frozen_channel_precedence");
      for (const ch of activeChannels) {
        if (ch.channelId === chosen.channelId) continue;
        supportingEvidenceRefs.push(...ch.primaryEvidenceRefs);
        supportingEvidenceRefs.push(...ch.supportingEvidenceRefs);
        alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
        rationale.push("retained_supporting_different_metric_channel");
      }
      // Within chosen channel, multiple_valid stays visible via channel status.
      if (chosen.status === "multiple_valid") {
        rationale.push("multiple_valid_no_frozen_precedence");
      }
    }
  } else if (policy.channelPrecedenceMode === "complementary_multiple_valid") {
    for (const ch of activeChannels) {
      primaryEvidenceRefs.push(...ch.primaryEvidenceRefs);
      supportingEvidenceRefs.push(...ch.supportingEvidenceRefs);
      alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
      rationale.push(...ch.rationaleCodes);
    }
    if (activeChannels.length > 1) {
      rationale.push("multiple_valid_no_frozen_precedence");
    }
  } else {
    // optional explanatory — first frozen channel wins as primary; rest supporting
    for (const channelId of policy.frozenChannelPrecedence) {
      const ch = channelById.get(channelId);
      if (!ch || ch.status === "insufficient") continue;
      if (primaryEvidenceRefs.length === 0) {
        primaryEvidenceRefs = [...ch.primaryEvidenceRefs];
        supportingEvidenceRefs.push(...ch.supportingEvidenceRefs);
        alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
      } else {
        supportingEvidenceRefs.push(...ch.primaryEvidenceRefs, ...ch.supportingEvidenceRefs);
        alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
        rationale.push("retained_supporting_different_metric_channel");
      }
    }
    for (const ch of activeChannels) {
      if (policy.frozenChannelPrecedence.includes(ch.channelId)) continue;
      supportingEvidenceRefs.push(...ch.primaryEvidenceRefs, ...ch.supportingEvidenceRefs);
      alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
    }
  }

  primaryEvidenceRefs = mergeUniqueRefs(primaryEvidenceRefs);
  supportingEvidenceRefs = mergeUniqueRefs(supportingEvidenceRefs).filter(
    (id) => !primaryEvidenceRefs.includes(id),
  );
  alternateEvidenceRefs = mergeUniqueRefs(alternateEvidenceRefs).filter(
    (id) => !primaryEvidenceRefs.includes(id) && !supportingEvidenceRefs.includes(id),
  );

  for (const ch of channelResults) {
    rationale.push(...ch.rationaleCodes);
  }

  const resolvedChannelCount = activeChannels.length;
  let status = rollupStatus(
    channelResults.map((c) => c.status),
    policy.channelPrecedenceMode,
    resolvedChannelCount,
  );

  if (
    status === "resolved_with_supporting" &&
    supportingEvidenceRefs.length === 0 &&
    primaryEvidenceRefs.length <= 1 &&
    !activeChannels.some((c) => c.status === "resolved_with_supporting")
  ) {
    status = "resolved";
  }

  if (status === "insufficient") {
    rationale.push("insufficient_required_inputs");
  }

  // Merge construct-relevant base exclusions (future/undated for eligible metrics).
  const eligibleMetricSet = new Set(
    policy.channels.flatMap((c) => c.metricKeys),
  );
  for (const ex of args.baseExclusions) {
    if (ex.metricKey && eligibleMetricSet.has(ex.metricKey)) {
      excluded.push(ex);
      rationale.push(ex.reasonCode);
    }
  }

  // Deterministic exclusion ordering.
  excluded.sort((a, b) => {
    const c = a.reasonCode.localeCompare(b.reasonCode);
    if (c !== 0) return c;
    return a.observationId.localeCompare(b.observationId);
  });

  const primaryObs =
    args.baseEligible.find((o) => o.observationId === primaryEvidenceRefs[0]) ?? null;

  const futureExcludedCount = excluded.filter(
    (e) => e.reasonCode === "excluded_future_measurement",
  ).length;
  const undatedCandidateCount = excluded.filter(
    (e) => e.reasonCode === "excluded_missing_measured_at",
  ).length;

  const methodFamilies = [
    ...new Set(
      constructCandidates.map((o) => methodFamilyOf(o)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const metricsPresent = [
    ...new Set(constructCandidates.map((o) => o.metricKey)),
  ].sort((a, b) => a.localeCompare(b));
  const regionsPresent = [
    ...new Set(constructCandidates.map((o) => o.region)),
  ].sort((a, b) => String(a).localeCompare(String(b)));

  const comparableSetCount = new Set(
    constructCandidates.map((o) => JSON.stringify(comparableKeyOf(o))),
  ).size;

  return {
    constructId: args.constructId,
    status,
    channels: channelResults,
    primaryEvidenceRefs,
    supportingEvidenceRefs,
    alternateEvidenceRefs,
    excludedCandidateSummaries: excluded,
    rationaleCodes: uniqueSortedCodes(rationale),
    recencyMetadata: buildRecencyMetadata({
      primaryObservation: primaryObs,
      asOfMs: args.asOfMs,
      datedPrimaryCount: primaryEvidenceRefs.length,
      undatedCandidateCount,
      futureExcludedCount,
    }),
    comparabilityMetadata: {
      comparableSetCount,
      methodFamiliesPresent: methodFamilies,
      metricsPresent,
      regionsPresent,
    },
  };
}

/** Re-export for tests. */
export function evaluateObservationForConstruct(
  observation: BodyCompositionEvidenceObservation,
  constructId: BodyCompositionConstructId,
  asOfMs: number,
  bundle: BodyCompositionEvidenceBundle,
) {
  const base = evaluateBaseEligibility(observation, asOfMs);
  if (!base.ok) return base;
  if (!isConstructPolicyEligible(base.observation, constructId)) {
    return {
      ok: false as const,
      observationId: base.observation.observationId,
      metricKey: base.observation.metricKey,
      reasonCode: "excluded_construct_ineligible" as const,
    };
  }
  return { ok: true as const, observation: base.observation, bundle };
}
