/**
 * Construct-specific evidence resolution (H1–H4, P1–P3).
 *
 * Status lattice (strict):
 * conflict > policy_not_frozen > multiple_valid > resolved_with_supporting > resolved
 * > undated_only > insufficient / unsupported
 *
 * resolved_with_supporting requires one truly resolved frozen primary and
 * governed supporting/alternates — never manufactured from unresolved primaries.
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

function isActive(status: BodyCompositionResolverConstructStatus): boolean {
  return status !== "insufficient" && status !== "unsupported";
}

/**
 * Apply frozen pairs + complementary/open rules to produce construct refs + status.
 */
function applyConstructPolicy(args: {
  policy: ResolverConstructPolicy;
  channelById: Map<string, BodyCompositionResolverChannelResult>;
  activeChannels: BodyCompositionResolverChannelResult[];
}): {
  status: BodyCompositionResolverConstructStatus;
  primaryEvidenceRefs: string[];
  supportingEvidenceRefs: string[];
  alternateEvidenceRefs: string[];
  rationaleCodes: BodyCompositionResolverRationaleCode[];
} {
  const { policy, channelById, activeChannels } = args;
  const rationale: BodyCompositionResolverRationaleCode[] = [];

  if (activeChannels.length === 0) {
    return {
      status: "insufficient",
      primaryEvidenceRefs: [],
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: [],
      rationaleCodes: ["insufficient_required_inputs"],
    };
  }

  // A. Conflict propagates.
  if (activeChannels.some((c) => c.status === "conflict")) {
    const refs = mergeUniqueRefs(...activeChannels.map((c) => c.primaryEvidenceRefs));
    return {
      status: "conflict",
      primaryEvidenceRefs: refs,
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: mergeUniqueRefs(
        ...activeChannels.map((c) => [...c.supportingEvidenceRefs, ...c.alternateEvidenceRefs]),
      ),
      rationaleCodes: ["policy_not_frozen"],
    };
  }

  // B. Any child policy_not_frozen (e.g. DXA+BIA day-boundary) propagates
  // unless a frozen primary channel is fully resolved and absorbs the rest as supporting.
  const policyNotFrozenChannels = activeChannels.filter((c) => c.status === "policy_not_frozen");
  const multipleValidChannels = activeChannels.filter((c) => c.status === "multiple_valid");

  // Try frozen precedence pairs first.
  let frozenPrimary: BodyCompositionResolverChannelResult | null = null;
  const frozenSupportingIds = new Set<string>();
  for (const pair of policy.frozenPrecedencePairs) {
    const primary = channelById.get(pair.primaryChannelId);
    const supporting = channelById.get(pair.supportingChannelId);
    if (!primary || !isActive(primary.status)) continue;
    // Frozen primary must be fully resolved (not multiple_valid / policy_not_frozen).
    if (primary.status === "resolved" || primary.status === "resolved_with_supporting") {
      frozenPrimary = primary;
      if (supporting && isActive(supporting.status)) {
        frozenSupportingIds.add(pair.supportingChannelId);
      }
      rationale.push("selected_frozen_channel_precedence");
      break;
    }
    // Primary channel itself unresolved → cannot claim frozen selection.
    if (
      primary.status === "multiple_valid" ||
      primary.status === "policy_not_frozen"
    ) {
      return {
        status: primary.status === "policy_not_frozen" ? "policy_not_frozen" : "multiple_valid",
        primaryEvidenceRefs: [...primary.primaryEvidenceRefs],
        supportingEvidenceRefs: [],
        alternateEvidenceRefs: mergeUniqueRefs(
          primary.alternateEvidenceRefs,
          ...activeChannels
            .filter((c) => c.channelId !== primary.channelId)
            .map((c) => [
              ...c.primaryEvidenceRefs,
              ...c.supportingEvidenceRefs,
              ...c.alternateEvidenceRefs,
            ]),
        ),
        rationaleCodes: uniqueSortedCodes([
          ...primary.rationaleCodes,
          primary.status === "policy_not_frozen"
            ? "policy_not_frozen"
            : "multiple_valid_no_frozen_precedence",
        ]),
      };
    }
  }

  if (frozenPrimary) {
    const primaryEvidenceRefs = [...frozenPrimary.primaryEvidenceRefs];
    const supportingEvidenceRefs: string[] = [...frozenPrimary.supportingEvidenceRefs];
    const alternateEvidenceRefs: string[] = [...frozenPrimary.alternateEvidenceRefs];

    for (const ch of activeChannels) {
      if (ch.channelId === frozenPrimary.channelId) continue;
      const def = policy.eligibleChannels.find((c) => c.channelId === ch.channelId);
      const governedSupport =
        frozenSupportingIds.has(ch.channelId) ||
        (def?.governedSupportingWhenPrimary?.includes(frozenPrimary.channelId) ?? false);

      if (ch.status === "policy_not_frozen" || ch.status === "multiple_valid") {
        // Unresolved child cannot be silently demoted into supporting to manufacture
        // resolved_with_supporting — but when frozen primary is resolved, retain as
        // alternate channel evidence with honest rationale.
        if (governedSupport || frozenSupportingIds.has(ch.channelId)) {
          // Supporting channel under frozen pair that is itself unresolved: keep
          // construct honest — policy_not_frozen / multiple_valid.
          return {
            status: ch.status === "policy_not_frozen" ? "policy_not_frozen" : "multiple_valid",
            primaryEvidenceRefs: mergeUniqueRefs(
              primaryEvidenceRefs,
              ch.primaryEvidenceRefs,
            ),
            supportingEvidenceRefs: [],
            alternateEvidenceRefs: mergeUniqueRefs(
              alternateEvidenceRefs,
              ch.alternateEvidenceRefs,
            ),
            rationaleCodes: uniqueSortedCodes([
              ...rationale,
              ...ch.rationaleCodes,
              ch.status === "policy_not_frozen"
                ? "policy_not_frozen"
                : "multiple_valid_no_frozen_precedence",
            ]),
          };
        }
        alternateEvidenceRefs.push(
          ...ch.primaryEvidenceRefs,
          ...ch.supportingEvidenceRefs,
          ...ch.alternateEvidenceRefs,
        );
        rationale.push("unfrozen_channel_precedence");
        continue;
      }

      if (governedSupport || frozenSupportingIds.has(ch.channelId)) {
        supportingEvidenceRefs.push(...ch.primaryEvidenceRefs, ...ch.supportingEvidenceRefs);
        alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
        rationale.push("retained_supporting_different_metric_channel");
      } else if (policy.openPrecedenceChannelIds.includes(ch.channelId)) {
        // Open competitor alongside frozen primary that isn't governed supporting.
        alternateEvidenceRefs.push(
          ...ch.primaryEvidenceRefs,
          ...ch.supportingEvidenceRefs,
          ...ch.alternateEvidenceRefs,
        );
        rationale.push("unfrozen_channel_precedence");
      } else {
        supportingEvidenceRefs.push(...ch.primaryEvidenceRefs, ...ch.supportingEvidenceRefs);
        alternateEvidenceRefs.push(...ch.alternateEvidenceRefs);
        rationale.push("retained_supporting_different_metric_channel");
      }
    }

    const support = mergeUniqueRefs(supportingEvidenceRefs).filter(
      (id) => !primaryEvidenceRefs.includes(id),
    );
    const alternates = mergeUniqueRefs(alternateEvidenceRefs).filter(
      (id) => !primaryEvidenceRefs.includes(id) && !support.includes(id),
    );

    if (support.length > 0 || frozenPrimary.status === "resolved_with_supporting") {
      return {
        status: "resolved_with_supporting",
        primaryEvidenceRefs,
        supportingEvidenceRefs: support,
        alternateEvidenceRefs: alternates,
        rationaleCodes: uniqueSortedCodes(rationale),
      };
    }
    return {
      status: "resolved",
      primaryEvidenceRefs,
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: alternates,
      rationaleCodes: uniqueSortedCodes(rationale),
    };
  }

  // No frozen primary selected.
  // Propagate child policy_not_frozen / multiple_valid.
  if (policyNotFrozenChannels.length > 0) {
    return {
      status: "policy_not_frozen",
      primaryEvidenceRefs: mergeUniqueRefs(...activeChannels.map((c) => c.primaryEvidenceRefs)),
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: mergeUniqueRefs(
        ...activeChannels.map((c) => [...c.supportingEvidenceRefs, ...c.alternateEvidenceRefs]),
      ),
      rationaleCodes: uniqueSortedCodes([
        ...policyNotFrozenChannels.flatMap((c) => c.rationaleCodes),
        "policy_not_frozen",
      ]),
    };
  }

  if (multipleValidChannels.length > 0) {
    return {
      status: "multiple_valid",
      primaryEvidenceRefs: mergeUniqueRefs(...activeChannels.map((c) => c.primaryEvidenceRefs)),
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: mergeUniqueRefs(
        ...activeChannels.map((c) => [...c.supportingEvidenceRefs, ...c.alternateEvidenceRefs]),
      ),
      rationaleCodes: uniqueSortedCodes([
        ...multipleValidChannels.flatMap((c) => c.rationaleCodes),
        "multiple_valid_no_frozen_precedence",
      ]),
    };
  }

  // Complementary: multiple resolved channels → multiple_valid.
  if (policy.complementary && activeChannels.length > 1) {
    return {
      status: "multiple_valid",
      primaryEvidenceRefs: mergeUniqueRefs(...activeChannels.map((c) => c.primaryEvidenceRefs)),
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: mergeUniqueRefs(
        ...activeChannels.map((c) => [...c.supportingEvidenceRefs, ...c.alternateEvidenceRefs]),
      ),
      rationaleCodes: ["multiple_valid_no_frozen_precedence"],
    };
  }

  // Open precedence group: 2+ active open channels without frozen pair.
  const openActive = activeChannels.filter((c) =>
    policy.openPrecedenceChannelIds.includes(c.channelId),
  );
  if (openActive.length >= 2) {
    return {
      status: "policy_not_frozen",
      primaryEvidenceRefs: mergeUniqueRefs(...openActive.map((c) => c.primaryEvidenceRefs)),
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: mergeUniqueRefs(
        ...openActive.map((c) => [...c.supportingEvidenceRefs, ...c.alternateEvidenceRefs]),
      ),
      rationaleCodes: ["unfrozen_channel_precedence", "policy_not_frozen"],
    };
  }

  // Single active resolved channel (sole available evidence).
  if (activeChannels.length === 1) {
    const only = activeChannels[0]!;
    if (only.status === "resolved" || only.status === "resolved_with_supporting") {
      return {
        status: only.status === "resolved_with_supporting" ? "resolved_with_supporting" : "resolved",
        primaryEvidenceRefs: [...only.primaryEvidenceRefs],
        supportingEvidenceRefs: [...only.supportingEvidenceRefs],
        alternateEvidenceRefs: [...only.alternateEvidenceRefs],
        rationaleCodes: uniqueSortedCodes(only.rationaleCodes),
      };
    }
  }

  // Multiple resolved channels without complementary or frozen pair.
  if (activeChannels.length > 1) {
    return {
      status: "policy_not_frozen",
      primaryEvidenceRefs: mergeUniqueRefs(...activeChannels.map((c) => c.primaryEvidenceRefs)),
      supportingEvidenceRefs: [],
      alternateEvidenceRefs: mergeUniqueRefs(
        ...activeChannels.map((c) => [...c.supportingEvidenceRefs, ...c.alternateEvidenceRefs]),
      ),
      rationaleCodes: ["unfrozen_channel_precedence", "policy_not_frozen"],
    };
  }

  const only = activeChannels[0]!;
  return {
    status: only.status,
    primaryEvidenceRefs: [...only.primaryEvidenceRefs],
    supportingEvidenceRefs: [...only.supportingEvidenceRefs],
    alternateEvidenceRefs: [...only.alternateEvidenceRefs],
    rationaleCodes: uniqueSortedCodes(only.rationaleCodes),
  };
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

  const constructCandidates: BodyCompositionEvidenceObservation[] = [];
  for (const obs of args.baseEligible) {
    if (!isConstructPolicyEligible(obs, args.constructId)) continue;
    constructCandidates.push(obs);
  }

  const channelResults: BodyCompositionResolverChannelResult[] = [];
  const channelById = new Map<string, BodyCompositionResolverChannelResult>();

  for (const channel of policy.eligibleChannels) {
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

  const activeChannels = channelResults.filter((c) => isActive(c.status));
  const applied = applyConstructPolicy({ policy, channelById, activeChannels });

  let primaryEvidenceRefs = mergeUniqueRefs(applied.primaryEvidenceRefs);
  let supportingEvidenceRefs = mergeUniqueRefs(applied.supportingEvidenceRefs).filter(
    (id) => !primaryEvidenceRefs.includes(id),
  );
  const alternateEvidenceRefs = mergeUniqueRefs(applied.alternateEvidenceRefs).filter(
    (id) => !primaryEvidenceRefs.includes(id) && !supportingEvidenceRefs.includes(id),
  );

  // Invariant: resolved_with_supporting cannot have unresolved multi-primary
  // with zero supporting.
  let status = applied.status;
  if (
    status === "resolved_with_supporting" &&
    (supportingEvidenceRefs.length === 0 ||
      activeChannels.some(
        (c) => c.status === "multiple_valid" || c.status === "policy_not_frozen",
      ))
  ) {
    status =
      activeChannels.some((c) => c.status === "policy_not_frozen")
        ? "policy_not_frozen"
        : "multiple_valid";
    // Promote mis-bucketed supporting back into primary when collapsing.
    if (supportingEvidenceRefs.length === 0 && primaryEvidenceRefs.length > 1) {
      // keep primaries
    } else if (status === "multiple_valid" || status === "policy_not_frozen") {
      primaryEvidenceRefs = mergeUniqueRefs(primaryEvidenceRefs, supportingEvidenceRefs);
      supportingEvidenceRefs = [];
    }
  }

  rationale.push(...applied.rationaleCodes);
  for (const ch of channelResults) {
    rationale.push(...ch.rationaleCodes);
  }

  if (status === "insufficient") {
    rationale.push("insufficient_required_inputs");
  }

  const eligibleMetricSet = new Set(
    policy.eligibleChannels.flatMap((c) => c.metricKeys),
  );
  for (const ex of args.baseExclusions) {
    if (ex.metricKey && eligibleMetricSet.has(ex.metricKey)) {
      excluded.push(ex);
      rationale.push(ex.reasonCode);
    }
  }

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
    ...new Set(constructCandidates.map((o) => methodFamilyOf(o))),
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
  const base = evaluateBaseEligibility(observation, asOfMs, bundle);
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
