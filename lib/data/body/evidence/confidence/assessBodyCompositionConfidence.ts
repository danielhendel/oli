/**
 * Body Composition Assessment Confidence — pure domain entry point.
 *
 * Inputs: evidence bundle + approved Resolver output + explicit asOf + version.
 * No Firebase, network, React, AsyncStorage, Date.now(), randomness,
 * favorability, or Health/Performance scores.
 */

import type {
  BodyCompositionAssessmentConfidence,
  BodyCompositionConfidenceLimitingFactor,
  BodyCompositionConfidenceRationaleCode,
  BodyCompositionConstructConfidenceAssessment,
  BodyCompositionConstructId,
  BodyCompositionDomainConfidenceAssessment,
  BodyCompositionEvidenceBundle,
} from "@oli/contracts";
import {
  BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
  BODY_COMPOSITION_RESOLVER_VERSION,
  bodyCompositionAssessmentConfidenceSchema,
} from "@oli/contracts";

import { assessConstructConfidence } from "./assessConstruct";
import { CONFIDENCE_POLICY_VERSION, DOMAIN_ROLLUP_POLICY_STATE } from "./policy";
import { validateConfidenceInput } from "./validateInput";

const CONSTRUCT_ORDER: readonly BodyCompositionConstructId[] = [
  "H1",
  "H2",
  "H3",
  "H4",
  "P1",
  "P2",
  "P3",
];

export type AssessBodyCompositionConfidenceInput = {
  bundle: BodyCompositionEvidenceBundle;
  /** Approved Resolver output — Confidence must not mutate or re-select. */
  resolution: unknown;
  /** Explicit assessment instant — never Date.now(). */
  asOf: string;
  confidenceVersion?: typeof BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION;
  resolverVersion?: typeof BODY_COMPOSITION_RESOLVER_VERSION;
};

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function emptyCompleteness(): BodyCompositionEvidenceBundle["completeness"] {
  return {
    mode: "caller_supplied_partial",
    profile: "missing",
    continuousEvents: "omitted",
    verifiedScanDetails: "omitted",
  };
}

function emptyConstructAssessment(
  constructId: BodyCompositionConstructId,
  rationaleCodes: BodyCompositionConfidenceRationaleCode[],
): BodyCompositionConstructConfidenceAssessment {
  return {
    constructId,
    status: "insufficient",
    label: null,
    resolverStatus: "insufficient",
    confidenceBasis: {
      constructId,
      factualDimensions: {
        resolverStatus: "insufficient",
        evidenceCompletenessMode: "caller_supplied_partial",
        primaryRefCount: 0,
        supportingRefCount: 0,
        alternateRefCount: 0,
        exclusionCount: 0,
        distinctSourceSystemCount: 0,
        distinctMethodFamilyCount: 0,
        channelCount: 0,
        complementaryChannelCount: 0,
        verifiedSourcePresent: false,
        measuredEvidencePresent: false,
        estimatedEvidencePresent: false,
        calculatedEvidencePresent: false,
        unknownMethodPresent: false,
        knownMethodPresent: false,
        protocolState: "not_applicable",
        calculatedProvenanceState: "not_applicable",
        datedEvidencePresent: false,
        undatedEvidencePresent: false,
        ageDays: null,
        recencyClass: null,
        recencyPolicyState: "threshold_not_frozen",
        conflictState: false,
        policyNotFrozenState: false,
        independenceState: "not_applicable",
        sourceSystemsPresent: [],
        methodFamiliesPresent: [],
        measurementMethodsPresent: [],
        metricsPresent: [],
        evidenceTypesPresent: [],
        protocolIdsPresent: [],
      },
      constructFacts: [],
    },
    supportingFactors: [],
    limitingFactors: uniqueSorted<BodyCompositionConfidenceLimitingFactor>([
      "caller_supplied_partial",
      "insufficient_required_inputs",
      "label_assignment_policy_not_frozen",
      "method_quality_policy_not_frozen",
      "device_quality_policy_not_frozen",
      "recency_threshold_not_frozen",
    ]),
    rationaleCodes: uniqueSorted<BodyCompositionConfidenceRationaleCode>([
      "invalid_input",
      "label_policy_not_frozen",
      "label_withheld_no_frozen_rule",
      "completeness_caller_supplied_partial",
      ...rationaleCodes,
    ]),
    primaryEvidenceRefs: [],
    supportingEvidenceRefs: [],
    alternateEvidenceRefs: [],
  };
}

function domainAssessments(): BodyCompositionDomainConfidenceAssessment[] {
  return [
    {
      domainId: "health",
      status: "policy_not_frozen",
      label: null,
      constructIds: ["H1", "H2", "H3", "H4"],
      supportingFactors: [],
      limitingFactors: [
        "domain_rollup_policy_not_frozen",
        "label_assignment_policy_not_frozen",
        "policy_not_frozen",
      ],
      rationaleCodes: [
        "domain_rollup_policy_not_frozen",
        "label_policy_not_frozen",
        "label_withheld_no_frozen_rule",
      ],
    },
    {
      domainId: "performance",
      status: "policy_not_frozen",
      label: null,
      constructIds: ["P1", "P2", "P3"],
      supportingFactors: [],
      limitingFactors: [
        "domain_rollup_policy_not_frozen",
        "label_assignment_policy_not_frozen",
        "policy_not_frozen",
      ],
      rationaleCodes: [
        "domain_rollup_policy_not_frozen",
        "label_policy_not_frozen",
        "label_withheld_no_frozen_rule",
      ],
    },
  ];
}

function failClosed(args: {
  asOf: string;
  completeness: BodyCompositionEvidenceBundle["completeness"];
  reasonCodes: BodyCompositionConfidenceRationaleCode[];
  safeNotes: string[];
  inputObservationCount: number;
}): BodyCompositionAssessmentConfidence {
  const reasonCounts: Partial<Record<BodyCompositionConfidenceRationaleCode, number>> = {};
  for (const code of args.reasonCodes) {
    reasonCounts[code] = (reasonCounts[code] ?? 0) + 1;
  }

  const constructAssessments = CONSTRUCT_ORDER.map((id) =>
    emptyConstructAssessment(id, args.reasonCodes),
  );

  return bodyCompositionAssessmentConfidenceSchema.parse({
    confidenceVersion: BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
    resolverVersion: BODY_COMPOSITION_RESOLVER_VERSION,
    asOf: args.asOf,
    evidenceBundleCompleteness: {
      ...args.completeness,
      mode: "caller_supplied_partial" as const,
    },
    scope: {
      mode: "caller_supplied_partial",
      accountEvidenceClaim: "scoped_to_supplied_evidence_only",
    },
    constructAssessments,
    domainAssessments: domainAssessments(),
    diagnostics: {
      inputObservationCount: args.inputObservationCount,
      constructAssessmentCount: constructAssessments.length,
      labeledConstructCount: 0,
      policyNotFrozenConstructCount: constructAssessments.filter(
        (a) => a.status === "policy_not_frozen",
      ).length,
      reasonCounts,
      safeNotes: [
        "confidence_draft_v1",
        "fail_closed",
        DOMAIN_ROLLUP_POLICY_STATE,
        "no_scores",
        "no_numeric_confidence",
        ...args.safeNotes,
      ],
    },
  });
}

/**
 * Assess construct-level Assessment Confidence from a caller-supplied bundle
 * and approved Resolver output. Deterministic for identical inputs.
 */
export function assessBodyCompositionConfidence(
  input: AssessBodyCompositionConfidenceInput,
): BodyCompositionAssessmentConfidence {
  const version = input.confidenceVersion ?? CONFIDENCE_POLICY_VERSION;
  const validated = validateConfidenceInput({
    bundle: input.bundle,
    resolution: input.resolution,
    asOf: input.asOf,
    confidenceVersion: version,
    ...(input.resolverVersion != null ? { resolverVersion: input.resolverVersion } : {}),
  });

  if (!validated.ok) {
    return failClosed({
      asOf: validated.asOf,
      completeness: emptyCompleteness(),
      reasonCodes: validated.reasonCodes,
      safeNotes: validated.safeNotes,
      inputObservationCount: 0,
    });
  }

  const { bundle, resolution, asOf } = validated;

  // Assess in frozen construct order; ignore input shuffle of constructs.
  const byId = new Map(resolution.constructs.map((c) => [c.constructId, c]));
  const constructAssessments = CONSTRUCT_ORDER.map((constructId) => {
    const construct = byId.get(constructId);
    if (!construct) {
      return emptyConstructAssessment(constructId, ["unknown_construct"]);
    }
    try {
      return assessConstructConfidence({ construct, bundle });
    } catch {
      // Isolate malformed construct where safely possible.
      return emptyConstructAssessment(constructId, ["invalid_input"]);
    }
  });

  const reasonCounts: Partial<Record<BodyCompositionConfidenceRationaleCode, number>> = {};
  const bump = (code: BodyCompositionConfidenceRationaleCode) => {
    reasonCounts[code] = (reasonCounts[code] ?? 0) + 1;
  };
  for (const assessment of constructAssessments) {
    for (const code of assessment.rationaleCodes) bump(code);
  }
  bump("domain_rollup_policy_not_frozen");

  const labeledConstructCount = constructAssessments.filter((a) => a.label != null).length;
  const policyNotFrozenConstructCount = constructAssessments.filter(
    (a) => a.status === "policy_not_frozen",
  ).length;

  return bodyCompositionAssessmentConfidenceSchema.parse({
    confidenceVersion: BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
    resolverVersion: resolution.resolverVersion,
    asOf,
    evidenceBundleCompleteness: {
      ...resolution.evidenceBundleCompleteness,
      mode: "caller_supplied_partial" as const,
    },
    scope: {
      mode: "caller_supplied_partial",
      accountEvidenceClaim: "scoped_to_supplied_evidence_only",
    },
    constructAssessments,
    domainAssessments: domainAssessments(),
    diagnostics: {
      inputObservationCount: bundle.observations.length,
      constructAssessmentCount: constructAssessments.length,
      labeledConstructCount,
      policyNotFrozenConstructCount,
      reasonCounts,
      safeNotes: [
        "confidence_draft_v1",
        "label_assignment_matrix_not_frozen",
        DOMAIN_ROLLUP_POLICY_STATE,
        "completeness_caller_supplied_partial",
        "no_scores",
        "no_numeric_confidence",
        "value_independent",
        "parser_confidence_not_consumed",
      ],
    },
  });
}
