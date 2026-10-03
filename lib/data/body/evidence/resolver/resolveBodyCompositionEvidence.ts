/**
 * Body Composition Evidence Resolver — pure domain entry point.
 *
 * Inputs: evidence bundle + explicit asOf + resolver policy version.
 * No Firebase, network, React, AsyncStorage, Date.now(), or score/confidence output.
 */

import type {
  BodyCompositionConstructId,
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceResolution,
  BodyCompositionResolverExcludedCandidateSummary,
  BodyCompositionResolverRationaleCode,
} from "@oli/contracts";
import {
  BODY_COMPOSITION_RESOLVER_VERSION,
  bodyCompositionEvidenceBundleSchema,
  bodyCompositionEvidenceResolutionSchema,
} from "@oli/contracts";

import { evaluateBaseEligibility } from "./eligibility";
import { RESOLVER_POLICY_VERSION } from "./policy";
import { parseAsOfMs } from "./recency";
import { resolveConstruct } from "./resolveConstruct";

const CONSTRUCT_ORDER: readonly BodyCompositionConstructId[] = [
  "H1",
  "H2",
  "H3",
  "H4",
  "P1",
  "P2",
  "P3",
];

export type ResolveBodyCompositionEvidenceInput = {
  bundle: BodyCompositionEvidenceBundle;
  /** Explicit assessment instant — resolver never calls Date.now(). */
  asOf: string;
  /** Must match body_composition_resolver_draft_v1. */
  resolverVersion?: typeof BODY_COMPOSITION_RESOLVER_VERSION;
};

function emptyCompleteness(): BodyCompositionEvidenceBundle["completeness"] {
  return {
    mode: "caller_supplied_partial",
    profile: "missing",
    continuousEvents: "omitted",
    verifiedScanDetails: "omitted",
  };
}

function insufficientAll(args: {
  asOf: string;
  completeness: BodyCompositionEvidenceBundle["completeness"];
  diagnosticsNotes: string[];
  reasonCounts: Partial<Record<BodyCompositionResolverRationaleCode, number>>;
}): BodyCompositionEvidenceResolution {
  const constructs = CONSTRUCT_ORDER.map((constructId) => ({
    constructId,
    status: "insufficient" as const,
    channels: [],
    primaryEvidenceRefs: [],
    supportingEvidenceRefs: [],
    alternateEvidenceRefs: [],
    excludedCandidateSummaries: [] as BodyCompositionResolverExcludedCandidateSummary[],
    rationaleCodes: ["insufficient_required_inputs"] as BodyCompositionResolverRationaleCode[],
    recencyMetadata: {
      recencyPolicyState: "threshold_not_frozen" as const,
      primaryAgeDays: null,
      primaryRecencyClass: null,
      datedPrimaryCount: 0,
      undatedCandidateCount: 0,
      futureExcludedCount: 0,
    },
    comparabilityMetadata: {
      comparableSetCount: 0,
      methodFamiliesPresent: [],
      metricsPresent: [],
      regionsPresent: [],
    },
  }));

  return bodyCompositionEvidenceResolutionSchema.parse({
    resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
    asOf: args.asOf,
    evidenceBundleCompleteness: args.completeness,
    constructs,
    diagnostics: {
      inputObservationCount: 0,
      uniqueObservationCount: 0,
      excludedCount: 0,
      reasonCounts: args.reasonCounts,
      safeNotes: args.diagnosticsNotes,
    },
  });
}

/**
 * Resolve construct evidence representatives from a caller-supplied bridge bundle.
 * Deterministic for identical inputs. Does not mutate the bundle.
 */
export function resolveBodyCompositionEvidence(
  input: ResolveBodyCompositionEvidenceInput,
): BodyCompositionEvidenceResolution {
  const version = input.resolverVersion ?? RESOLVER_POLICY_VERSION;
  if (version !== BODY_COMPOSITION_RESOLVER_VERSION) {
    return insufficientAll({
      asOf: input.asOf,
      completeness: emptyCompleteness(),
      diagnosticsNotes: ["unsupported_resolver_version"],
      reasonCounts: { policy_not_frozen: 1 },
    });
  }

  const asOfMs = parseAsOfMs(input.asOf);
  if (asOfMs == null) {
    // Fail closed with a syntactically valid placeholder asOf for schema output.
    const fallbackAsOf = "1970-01-01T00:00:00.000Z";
    return insufficientAll({
      asOf: fallbackAsOf,
      completeness: emptyCompleteness(),
      diagnosticsNotes: ["as_of_invalid"],
      reasonCounts: { as_of_invalid: 1 },
    });
  }

  const bundleParsed = bodyCompositionEvidenceBundleSchema.safeParse(input.bundle);
  if (!bundleParsed.success) {
    return insufficientAll({
      asOf: input.asOf,
      completeness: emptyCompleteness(),
      diagnosticsNotes: ["bundle_schema_invalid"],
      reasonCounts: { bundle_schema_invalid: 1 },
    });
  }
  const bundle = bundleParsed.data;

  // Completeness must never upgrade beyond caller_supplied_partial.
  const completeness = {
    ...bundle.completeness,
    mode: "caller_supplied_partial" as const,
  };

  // Dedupe by observationId only (stable identity).
  const seenIds = new Set<string>();
  const uniqueObservations: BodyCompositionEvidenceObservation[] = [];
  const exclusions: BodyCompositionResolverExcludedCandidateSummary[] = [];
  const reasonCounts: Partial<Record<BodyCompositionResolverRationaleCode, number>> = {};

  const bump = (code: BodyCompositionResolverRationaleCode) => {
    reasonCounts[code] = (reasonCounts[code] ?? 0) + 1;
  };

  const sortedInput = [...bundle.observations].sort((a, b) =>
    a.observationId.localeCompare(b.observationId),
  );

  for (const obs of sortedInput) {
    if (seenIds.has(obs.observationId)) {
      exclusions.push({
        observationId: obs.observationId,
        metricKey: obs.metricKey,
        reasonCode: "excluded_duplicate_observation_id",
      });
      bump("excluded_duplicate_observation_id");
      continue;
    }
    seenIds.add(obs.observationId);

    const eligibility = evaluateBaseEligibility(obs, asOfMs);
    if (!eligibility.ok) {
      exclusions.push({
        observationId: eligibility.observationId,
        metricKey: eligibility.metricKey,
        reasonCode: eligibility.reasonCode,
      });
      bump(eligibility.reasonCode);
      continue;
    }
    uniqueObservations.push(eligibility.observation);
  }

  // Legacy profile waist is subject-context only — never dated evidence.
  if (bundle.subjectContext.waist.valueCm != null) {
    bump("legacy_profile_waist_not_dated_evidence");
  }

  const constructs = CONSTRUCT_ORDER.map((constructId) =>
    resolveConstruct({
      constructId,
      bundle,
      asOfMs,
      baseEligible: uniqueObservations,
      baseExclusions: exclusions,
    }),
  );

  const resolution = {
    resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
    asOf: input.asOf,
    evidenceBundleCompleteness: completeness,
    constructs,
    diagnostics: {
      inputObservationCount: bundle.observations.length,
      uniqueObservationCount: uniqueObservations.length,
      excludedCount: exclusions.length,
      reasonCounts,
      safeNotes: [
        "resolver_draft_v1",
        "no_confidence",
        "no_scores",
        "completeness_caller_supplied_partial",
      ],
    },
  };

  return bodyCompositionEvidenceResolutionSchema.parse(resolution);
}
