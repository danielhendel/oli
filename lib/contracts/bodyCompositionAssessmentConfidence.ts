/**
 * Body Composition Assessment Confidence contracts (derived runtime view).
 *
 * Answers: how well-supported is this assessment by supplied evidence and
 * currently frozen scientific policies?
 *
 * Does NOT answer health favorability, disease risk, performance ability,
 * or Health/Performance Composition scores.
 *
 * No persistence. No consumer UI. No numeric confidence score.
 */

import { z } from "zod";

import {
  bodyCompositionConstructIdSchema,
  bodyCompositionEvidenceCompletenessSchema,
  bodyCompositionEvidenceMetricKeySchema,
  bodyCompositionEvidenceTypeSchema,
  bodyCompositionMeasurementMethodSchema,
  bodyCompositionRecencyClassSchema,
  bodyCompositionSourceSystemSchema,
  bodyCompositionWaistProtocolIdSchema,
} from "./bodyCompositionEvidence";
import {
  BODY_COMPOSITION_RESOLVER_VERSION,
  bodyCompositionResolverConstructStatusSchema,
  bodyCompositionResolverMethodFamilySchema,
  bodyCompositionResolverRecencyPolicyStateSchema,
  bodyCompositionResolverVersionSchema,
} from "./bodyCompositionEvidenceResolver";

/** Draft policy id — not clinically validated, calibrated, or score validated. */
export const BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION =
  "body_composition_assessment_confidence_draft_v1" as const;

export const bodyCompositionAssessmentConfidenceVersionSchema = z.literal(
  BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
);
export type BodyCompositionAssessmentConfidenceVersion = z.infer<
  typeof bodyCompositionAssessmentConfidenceVersionSchema
>;

export const bodyCompositionConfidenceConstructStatusSchema = z.enum([
  "assessed",
  "insufficient",
  "unsupported",
  "conflict",
  "undated_only",
  "policy_not_frozen",
]);
export type BodyCompositionConfidenceConstructStatus = z.infer<
  typeof bodyCompositionConfidenceConstructStatusSchema
>;

/**
 * Permitted qualitative labels only.
 * Assignment requires an explicit frozen rule matrix — currently OPEN.
 * `null` is correct when policy is not frozen.
 */
export const bodyCompositionConfidenceLabelSchema = z.enum([
  "limited",
  "moderate",
  "good",
  "strong",
]);
export type BodyCompositionConfidenceLabel = z.infer<
  typeof bodyCompositionConfidenceLabelSchema
>;

export const bodyCompositionConfidenceDomainIdSchema = z.enum(["health", "performance"]);
export type BodyCompositionConfidenceDomainId = z.infer<
  typeof bodyCompositionConfidenceDomainIdSchema
>;

export const bodyCompositionConfidenceProtocolStateSchema = z.enum([
  "known_governed",
  "unknown",
  "missing",
  "unsupported",
  "not_applicable",
]);
export type BodyCompositionConfidenceProtocolState = z.infer<
  typeof bodyCompositionConfidenceProtocolStateSchema
>;

export const bodyCompositionConfidenceCalculatedProvenanceStateSchema = z.enum([
  "complete",
  "unavailable",
  "not_applicable",
]);
export type BodyCompositionConfidenceCalculatedProvenanceState = z.infer<
  typeof bodyCompositionConfidenceCalculatedProvenanceStateSchema
>;

export const bodyCompositionConfidenceIndependenceStateSchema = z.enum([
  "independence_unknown",
  "single_observation",
  "not_applicable",
]);
export type BodyCompositionConfidenceIndependenceState = z.infer<
  typeof bodyCompositionConfidenceIndependenceStateSchema
>;

export const bodyCompositionConfidenceScopeSchema = z
  .object({
    /** V1 never proves account-wide enumeration. */
    mode: z.literal("caller_supplied_partial"),
    accountEvidenceClaim: z.literal("scoped_to_supplied_evidence_only"),
  })
  .strip();

export type BodyCompositionConfidenceScope = z.infer<
  typeof bodyCompositionConfidenceScopeSchema
>;

export const bodyCompositionConfidenceSupportingFactorSchema = z.enum([
  "resolver_primary_resolved",
  "resolver_supporting_present",
  "verified_source_present",
  "measured_evidence_present",
  "governed_protocol_present",
  "calculated_provenance_complete",
  "dated_evidence_present",
  "complementary_channel_present",
  "known_method_present",
]);
export type BodyCompositionConfidenceSupportingFactor = z.infer<
  typeof bodyCompositionConfidenceSupportingFactorSchema
>;

export const bodyCompositionConfidenceLimitingFactorSchema = z.enum([
  "caller_supplied_partial",
  "policy_not_frozen",
  "label_assignment_policy_not_frozen",
  "method_unknown",
  "protocol_unknown",
  "protocol_missing",
  "undated_only",
  "conflict_present",
  "multiple_valid_unranked",
  "calculated_provenance_unavailable",
  "recency_threshold_not_frozen",
  "device_quality_policy_not_frozen",
  "method_quality_policy_not_frozen",
  "independence_unknown",
  "estimated_evidence_present",
  "domain_rollup_policy_not_frozen",
  "insufficient_required_inputs",
  "unsupported_evidence",
]);
export type BodyCompositionConfidenceLimitingFactor = z.infer<
  typeof bodyCompositionConfidenceLimitingFactorSchema
>;

export const bodyCompositionConfidenceRationaleCodeSchema = z.enum([
  "factual_basis_extracted",
  "label_policy_not_frozen",
  "label_withheld_no_frozen_rule",
  "label_not_assigned_from_favorability",
  "resolver_status_resolved",
  "resolver_status_resolved_with_supporting",
  "resolver_status_multiple_valid",
  "resolver_status_policy_not_frozen",
  "resolver_status_conflict",
  "resolver_status_insufficient",
  "resolver_status_undated_only",
  "resolver_status_unsupported",
  "completeness_caller_supplied_partial",
  "recency_factual_only_threshold_not_frozen",
  "method_quality_policy_not_frozen",
  "device_quality_policy_not_frozen",
  "source_independence_unknown",
  "domain_rollup_policy_not_frozen",
  "value_independent_assessment",
  "parser_confidence_not_consumed",
  "bundle_schema_invalid",
  "resolution_schema_invalid",
  "completeness_mismatch",
  "unsupported_resolver_version",
  "unsupported_confidence_version",
  "as_of_invalid",
  "as_of_mismatch",
  "dangling_resolver_observation_ref",
  "duplicate_construct_result",
  "unknown_construct",
  "invalid_input",
]);
export type BodyCompositionConfidenceRationaleCode = z.infer<
  typeof bodyCompositionConfidenceRationaleCodeSchema
>;

export const bodyCompositionConfidenceFactualDimensionsSchema = z
  .object({
    resolverStatus: bodyCompositionResolverConstructStatusSchema,
    evidenceCompletenessMode: z.literal("caller_supplied_partial"),
    primaryRefCount: z.number().int().nonnegative(),
    supportingRefCount: z.number().int().nonnegative(),
    alternateRefCount: z.number().int().nonnegative(),
    exclusionCount: z.number().int().nonnegative(),
    distinctSourceSystemCount: z.number().int().nonnegative(),
    distinctMethodFamilyCount: z.number().int().nonnegative(),
    channelCount: z.number().int().nonnegative(),
    complementaryChannelCount: z.number().int().nonnegative(),
    verifiedSourcePresent: z.boolean(),
    measuredEvidencePresent: z.boolean(),
    estimatedEvidencePresent: z.boolean(),
    calculatedEvidencePresent: z.boolean(),
    unknownMethodPresent: z.boolean(),
    knownMethodPresent: z.boolean(),
    protocolState: bodyCompositionConfidenceProtocolStateSchema,
    calculatedProvenanceState: bodyCompositionConfidenceCalculatedProvenanceStateSchema,
    datedEvidencePresent: z.boolean(),
    undatedEvidencePresent: z.boolean(),
    ageDays: z.number().finite().nonnegative().nullable(),
    recencyClass: bodyCompositionRecencyClassSchema.nullable(),
    recencyPolicyState: bodyCompositionResolverRecencyPolicyStateSchema,
    conflictState: z.boolean(),
    policyNotFrozenState: z.boolean(),
    independenceState: bodyCompositionConfidenceIndependenceStateSchema,
    sourceSystemsPresent: z.array(bodyCompositionSourceSystemSchema),
    methodFamiliesPresent: z.array(bodyCompositionResolverMethodFamilySchema),
    measurementMethodsPresent: z.array(bodyCompositionMeasurementMethodSchema),
    metricsPresent: z.array(bodyCompositionEvidenceMetricKeySchema),
    evidenceTypesPresent: z.array(bodyCompositionEvidenceTypeSchema),
    protocolIdsPresent: z.array(bodyCompositionWaistProtocolIdSchema),
  })
  .strip()
  .superRefine((value, ctx) => {
    const forbiddenNumericKeys = [
      "confidenceScore",
      "qualityScore",
      "points",
      "weight",
      "percentage",
      "normalizedScore",
    ] as const;
    for (const key of forbiddenNumericKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `forbidden numeric confidence field ${key}`,
          path: [key],
        });
      }
    }
  });

export type BodyCompositionConfidenceFactualDimensions = z.infer<
  typeof bodyCompositionConfidenceFactualDimensionsSchema
>;

export const bodyCompositionConfidenceBasisSchema = z
  .object({
    constructId: bodyCompositionConstructIdSchema,
    factualDimensions: bodyCompositionConfidenceFactualDimensionsSchema,
    /** Construct-specific factual tokens (not scores). */
    constructFacts: z.array(z.string().min(1).max(80)),
  })
  .strip();

export type BodyCompositionConfidenceBasis = z.infer<
  typeof bodyCompositionConfidenceBasisSchema
>;

export const bodyCompositionConstructConfidenceAssessmentSchema = z
  .object({
    constructId: bodyCompositionConstructIdSchema,
    status: bodyCompositionConfidenceConstructStatusSchema,
    /** Nullable — Limited/Moderate/Good/Strong require frozen assignment rules. */
    label: bodyCompositionConfidenceLabelSchema.nullable(),
    resolverStatus: bodyCompositionResolverConstructStatusSchema,
    confidenceBasis: bodyCompositionConfidenceBasisSchema,
    supportingFactors: z.array(bodyCompositionConfidenceSupportingFactorSchema),
    limitingFactors: z.array(bodyCompositionConfidenceLimitingFactorSchema),
    rationaleCodes: z.array(bodyCompositionConfidenceRationaleCodeSchema),
    /**
     * Provenance refs copied from Resolver classifications only.
     * Confidence never reclassifies primary/supporting/alternate/exclusion.
     */
    primaryEvidenceRefs: z.array(z.string().min(1).max(240)),
    supportingEvidenceRefs: z.array(z.string().min(1).max(240)),
    alternateEvidenceRefs: z.array(z.string().min(1).max(240)),
  })
  .strip()
  .superRefine((value, ctx) => {
    if (value.label != null && value.status !== "assessed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "non-null label requires status assessed",
        path: ["label"],
      });
    }
    if (value.status === "policy_not_frozen" && value.label != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "policy_not_frozen must withhold label",
        path: ["label"],
      });
    }
    const forbidden = [
      "confidenceScore",
      "confidencePercent",
      "healthScore",
      "performanceScore",
      "score",
      "favorability",
      "riskPercent",
      "statusLevel",
    ] as const;
    for (const key of forbidden) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `forbidden field ${key}`,
          path: [key],
        });
      }
    }
  });

export type BodyCompositionConstructConfidenceAssessment = z.infer<
  typeof bodyCompositionConstructConfidenceAssessmentSchema
>;

export const bodyCompositionDomainConfidenceAssessmentSchema = z
  .object({
    domainId: bodyCompositionConfidenceDomainIdSchema,
    status: bodyCompositionConfidenceConstructStatusSchema,
    label: bodyCompositionConfidenceLabelSchema.nullable(),
    constructIds: z.array(bodyCompositionConstructIdSchema),
    supportingFactors: z.array(bodyCompositionConfidenceSupportingFactorSchema),
    limitingFactors: z.array(bodyCompositionConfidenceLimitingFactorSchema),
    rationaleCodes: z.array(bodyCompositionConfidenceRationaleCodeSchema),
  })
  .strip()
  .superRefine((value, ctx) => {
    if (value.label != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "domain label requires frozen domain rollup policy",
        path: ["label"],
      });
    }
  });

export type BodyCompositionDomainConfidenceAssessment = z.infer<
  typeof bodyCompositionDomainConfidenceAssessmentSchema
>;

export const bodyCompositionAssessmentConfidenceDiagnosticsSchema = z
  .object({
    inputObservationCount: z.number().int().nonnegative(),
    constructAssessmentCount: z.number().int().nonnegative(),
    labeledConstructCount: z.number().int().nonnegative(),
    policyNotFrozenConstructCount: z.number().int().nonnegative(),
    reasonCounts: z.record(
      bodyCompositionConfidenceRationaleCodeSchema,
      z.number().int().nonnegative(),
    ),
    /** Safe operation tokens only — never observation values/IDs in logs. */
    safeNotes: z.array(z.string().min(1).max(120)),
  })
  .strip();

export type BodyCompositionAssessmentConfidenceDiagnostics = z.infer<
  typeof bodyCompositionAssessmentConfidenceDiagnosticsSchema
>;

/**
 * Runtime-derived Assessment Confidence output.
 * Must not include uid, numeric confidence, favorability, or composition scores.
 */
export const bodyCompositionAssessmentConfidenceSchema = z
  .object({
    confidenceVersion: bodyCompositionAssessmentConfidenceVersionSchema,
    resolverVersion: bodyCompositionResolverVersionSchema,
    asOf: z.string().datetime(),
    evidenceBundleCompleteness: bodyCompositionEvidenceCompletenessSchema,
    scope: bodyCompositionConfidenceScopeSchema,
    constructAssessments: z.array(bodyCompositionConstructConfidenceAssessmentSchema).length(7),
    domainAssessments: z.array(bodyCompositionDomainConfidenceAssessmentSchema).length(2),
    diagnostics: bodyCompositionAssessmentConfidenceDiagnosticsSchema,
  })
  .strip()
  .superRefine((value, ctx) => {
    if ("uid" in value || "userId" in value || "accountId" in value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "identity fields are forbidden on confidence output",
      });
    }
    const ids = value.constructAssessments.map((c) => c.constructId).sort().join(",");
    if (ids !== "H1,H2,H3,H4,P1,P2,P3") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "constructAssessments must contain exactly H1–H4 and P1–P3",
        path: ["constructAssessments"],
      });
    }
    const domainIds = value.domainAssessments.map((d) => d.domainId).sort().join(",");
    if (domainIds !== "health,performance") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "domainAssessments must contain health and performance",
        path: ["domainAssessments"],
      });
    }
    if (value.resolverVersion !== BODY_COMPOSITION_RESOLVER_VERSION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unsupported resolver version on confidence output",
        path: ["resolverVersion"],
      });
    }
    if (value.evidenceBundleCompleteness.mode !== "caller_supplied_partial") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completeness must remain caller_supplied_partial",
        path: ["evidenceBundleCompleteness", "mode"],
      });
    }
    if (value.scope.mode !== "caller_supplied_partial") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scope must remain caller_supplied_partial",
        path: ["scope", "mode"],
      });
    }
  });

export type BodyCompositionAssessmentConfidence = z.infer<
  typeof bodyCompositionAssessmentConfidenceSchema
>;

/** Frozen label-assignment rule count for this draft version. */
export const BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT = 0 as const;

/** Explicit statement: qualitative label matrix is OPEN in draft_v1. */
export const BODY_COMPOSITION_CONFIDENCE_LABEL_POLICY_STATE =
  "label_assignment_matrix_not_frozen" as const;
