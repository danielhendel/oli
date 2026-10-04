/**
 * Body Composition Evidence Resolver contracts (derived runtime view).
 *
 * Selects construct representatives from an Evidence Bridge bundle.
 * No persistence, no Assessment Confidence, no Health/Performance scores.
 */

import { z } from "zod";

import {
  bodyCompositionConstructIdSchema,
  bodyCompositionEvidenceCompletenessSchema,
  bodyCompositionEvidenceMetricKeySchema,
  bodyCompositionMeasurementMethodSchema,
  bodyCompositionRecencyClassSchema,
} from "./bodyCompositionEvidence";
import { bodyScanRegionSchema } from "./bodyScans";

/** Draft policy id — not clinically validated, production calibrated, or score validated. */
export const BODY_COMPOSITION_RESOLVER_VERSION =
  "body_composition_resolver_draft_v1" as const;

export const bodyCompositionResolverVersionSchema = z.literal(
  BODY_COMPOSITION_RESOLVER_VERSION,
);
export type BodyCompositionResolverVersion = z.infer<
  typeof bodyCompositionResolverVersionSchema
>;

export const bodyCompositionResolverConstructStatusSchema = z.enum([
  "resolved",
  "resolved_with_supporting",
  "multiple_valid",
  "insufficient",
  "conflict",
  "undated_only",
  "unsupported",
  "policy_not_frozen",
]);
export type BodyCompositionResolverConstructStatus = z.infer<
  typeof bodyCompositionResolverConstructStatusSchema
>;

export const bodyCompositionResolverRationaleCodeSchema = z.enum([
  "selected_only_eligible_candidate",
  "selected_newest_within_comparable_family",
  /** Dormant — authorized conceptually; inactive until day-boundary ADR. */
  "selected_verified_dxa_same_day_precedence",
  "selected_standardized_waist_path",
  "selected_frozen_channel_precedence",
  "retained_supporting_different_method",
  "retained_supporting_different_metric_channel",
  "retained_alternate_older_same_family",
  "excluded_future_measurement",
  "excluded_missing_measured_at",
  "excluded_invalid_unit",
  "excluded_invalid_value",
  "excluded_missing_formula_provenance",
  "excluded_unsupported_formula_version",
  "excluded_missing_formula_input",
  "excluded_dangling_input_ref",
  "excluded_wrong_formula_input_metric",
  "excluded_duplicate_formula_input_ref",
  "excluded_formula_input_cycle",
  "excluded_missing_height_provenance",
  "excluded_unknown_protocol_for_standardized_primary",
  "excluded_unverified_source",
  "excluded_construct_ineligible",
  "excluded_unsupported_region",
  "excluded_unknown_metric",
  "excluded_duplicate_observation_id",
  "not_comparable_different_method",
  "not_comparable_different_formula_version",
  "not_comparable_different_metric",
  "not_comparable_different_region",
  "multiple_valid_no_frozen_precedence",
  "same_day_boundary_not_frozen",
  "same_day_precedence_not_applied",
  "unfrozen_channel_precedence",
  "insufficient_required_inputs",
  "policy_not_frozen",
  "legacy_profile_waist_not_dated_evidence",
  "bundle_schema_invalid",
  "as_of_invalid",
]);
export type BodyCompositionResolverRationaleCode = z.infer<
  typeof bodyCompositionResolverRationaleCodeSchema
>;

export const bodyCompositionResolverRecencyPolicyStateSchema = z.enum([
  "threshold_not_frozen",
  "dated",
  "undated",
  "future_invalid",
]);
export type BodyCompositionResolverRecencyPolicyState = z.infer<
  typeof bodyCompositionResolverRecencyPolicyStateSchema
>;

export const bodyCompositionResolverMethodFamilySchema = z.enum([
  "dxa",
  "consumer_bia",
  "segmental_bia",
  "manual_anthropometry",
  "scale_weight",
  "air_displacement",
  "calculated",
  "other",
  "unknown",
]);
export type BodyCompositionResolverMethodFamily = z.infer<
  typeof bodyCompositionResolverMethodFamilySchema
>;

export const bodyCompositionResolverExcludedCandidateSummarySchema = z
  .object({
    observationId: z.string().min(1).max(240),
    metricKey: bodyCompositionEvidenceMetricKeySchema.nullable(),
    reasonCode: bodyCompositionResolverRationaleCodeSchema,
  })
  .strip();

export type BodyCompositionResolverExcludedCandidateSummary = z.infer<
  typeof bodyCompositionResolverExcludedCandidateSummarySchema
>;

export const bodyCompositionResolverRecencyMetadataSchema = z
  .object({
    /** Exact half-lives / freshness scores are not frozen — do not invent them. */
    recencyPolicyState: bodyCompositionResolverRecencyPolicyStateSchema,
    primaryAgeDays: z.number().finite().nonnegative().nullable(),
    primaryRecencyClass: bodyCompositionRecencyClassSchema.nullable(),
    datedPrimaryCount: z.number().int().nonnegative(),
    undatedCandidateCount: z.number().int().nonnegative(),
    futureExcludedCount: z.number().int().nonnegative(),
  })
  .strip();

export type BodyCompositionResolverRecencyMetadata = z.infer<
  typeof bodyCompositionResolverRecencyMetadataSchema
>;

export const bodyCompositionResolverComparabilityMetadataSchema = z
  .object({
    comparableSetCount: z.number().int().nonnegative(),
    methodFamiliesPresent: z.array(bodyCompositionResolverMethodFamilySchema),
    metricsPresent: z.array(bodyCompositionEvidenceMetricKeySchema),
    regionsPresent: z.array(bodyScanRegionSchema.nullable()),
  })
  .strip();

export type BodyCompositionResolverComparabilityMetadata = z.infer<
  typeof bodyCompositionResolverComparabilityMetadataSchema
>;

export const bodyCompositionResolverChannelResultSchema = z
  .object({
    channelId: z.string().min(1).max(80),
    status: bodyCompositionResolverConstructStatusSchema,
    primaryEvidenceRefs: z.array(z.string().min(1).max(240)),
    supportingEvidenceRefs: z.array(z.string().min(1).max(240)),
    alternateEvidenceRefs: z.array(z.string().min(1).max(240)),
    rationaleCodes: z.array(bodyCompositionResolverRationaleCodeSchema),
  })
  .strip();

export type BodyCompositionResolverChannelResult = z.infer<
  typeof bodyCompositionResolverChannelResultSchema
>;

export const bodyCompositionResolverConstructResultSchema = z
  .object({
    constructId: bodyCompositionConstructIdSchema,
    status: bodyCompositionResolverConstructStatusSchema,
    /** Distinct scientific channels for this construct (e.g. WHtR vs VAT). */
    channels: z.array(bodyCompositionResolverChannelResultSchema),
    primaryEvidenceRefs: z.array(z.string().min(1).max(240)),
    supportingEvidenceRefs: z.array(z.string().min(1).max(240)),
    alternateEvidenceRefs: z.array(z.string().min(1).max(240)),
    excludedCandidateSummaries: z.array(bodyCompositionResolverExcludedCandidateSummarySchema),
    rationaleCodes: z.array(bodyCompositionResolverRationaleCodeSchema),
    recencyMetadata: bodyCompositionResolverRecencyMetadataSchema,
    comparabilityMetadata: bodyCompositionResolverComparabilityMetadataSchema,
  })
  .strip()
  .superRefine((value, ctx) => {
    const forbiddenKeys = [
      "confidence",
      "confidenceLabel",
      "confidenceScore",
      "healthScore",
      "performanceScore",
      "score",
      "riskPercent",
      "statusLevel",
    ] as const;
    for (const key of forbiddenKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `forbidden field ${key}`,
          path: [key],
        });
      }
    }
  });

export type BodyCompositionResolverConstructResult = z.infer<
  typeof bodyCompositionResolverConstructResultSchema
>;

export const bodyCompositionResolverDiagnosticsSchema = z
  .object({
    inputObservationCount: z.number().int().nonnegative(),
    uniqueObservationCount: z.number().int().nonnegative(),
    excludedCount: z.number().int().nonnegative(),
    reasonCounts: z.record(bodyCompositionResolverRationaleCodeSchema, z.number().int().nonnegative()),
    /** Safe operation tokens only — never observation values/IDs in logs. */
    safeNotes: z.array(z.string().min(1).max(120)),
  })
  .strip();

export type BodyCompositionResolverDiagnostics = z.infer<
  typeof bodyCompositionResolverDiagnosticsSchema
>;

/**
 * Runtime-derived resolution output.
 * Must not include uid, confidence labels/scores, or composition scores.
 */
export const bodyCompositionEvidenceResolutionSchema = z
  .object({
    resolverVersion: bodyCompositionResolverVersionSchema,
    asOf: z.string().datetime(),
    evidenceBundleCompleteness: bodyCompositionEvidenceCompletenessSchema,
    constructs: z.array(bodyCompositionResolverConstructResultSchema).length(7),
    diagnostics: bodyCompositionResolverDiagnosticsSchema,
  })
  .strip()
  .superRefine((value, ctx) => {
    if ("uid" in value || "userId" in value || "accountId" in value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "identity fields are forbidden on resolver output",
      });
    }
    const ids = value.constructs.map((c) => c.constructId).sort().join(",");
    if (ids !== "H1,H2,H3,H4,P1,P2,P3") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "constructs must contain exactly H1–H4 and P1–P3",
        path: ["constructs"],
      });
    }
  });

export type BodyCompositionEvidenceResolution = z.infer<
  typeof bodyCompositionEvidenceResolutionSchema
>;

/** Map governed measurement methods onto resolver method families. */
export function bodyCompositionMethodToFamily(
  method: z.infer<typeof bodyCompositionMeasurementMethodSchema>,
  evidenceType: "measured" | "calculated" | "estimated",
): BodyCompositionResolverMethodFamily {
  if (evidenceType === "calculated") return "calculated";
  switch (method) {
    case "dxa":
      return "dxa";
    case "consumer_bia":
      return "consumer_bia";
    case "segmental_bia":
      return "segmental_bia";
    case "manual_anthropometry":
      return "manual_anthropometry";
    case "scale_weight":
      return "scale_weight";
    case "air_displacement":
      return "air_displacement";
    case "other":
      return "other";
    case "unknown":
    default:
      return "unknown";
  }
}
