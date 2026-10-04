/**
 * Body Composition Dual Score contracts (internal draft engines).
 *
 * Pure derived runtime view only.
 * No persistence. No consumer UI. No public release.
 *
 * Authority:
 * docs/00_truth/phase3/BODY_COMPOSITION_DUAL_SCORE_MATHEMATICAL_TRUTH_FREEZE_V1.md
 */

import { z } from "zod";

import { bodyCompositionEvidenceCompletenessSchema } from "./bodyCompositionEvidence";
import { BODY_COMPOSITION_RESOLVER_VERSION } from "./bodyCompositionEvidenceResolver";

/** Internal draft Health Composition engine version — not public. */
export const BODY_COMPOSITION_HEALTH_SCORE_VERSION =
  "body_composition_health_score_draft_v1" as const;

/** Internal draft Performance-Supporting Composition engine version — not public. */
export const BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION =
  "body_composition_performance_supporting_score_draft_v1" as const;

export const bodyCompositionHealthScoreVersionSchema = z.literal(
  BODY_COMPOSITION_HEALTH_SCORE_VERSION,
);
export type BodyCompositionHealthScoreVersion = z.infer<
  typeof bodyCompositionHealthScoreVersionSchema
>;

export const bodyCompositionPerformanceSupportingScoreVersionSchema = z.literal(
  BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_VERSION,
);
export type BodyCompositionPerformanceSupportingScoreVersion = z.infer<
  typeof bodyCompositionPerformanceSupportingScoreVersionSchema
>;

/** Canonical withholding vocabulary — exact freeze spellings only. */
export const BODY_COMPOSITION_SCORE_REASON_CODES = [
  "invalid_provenance",
  "future_evidence",
  "evidence_too_old",
  "evidence_era_mismatch",
  "required_age_missing",
  "required_sex_missing",
  "required_height_missing",
  "unsupported_method",
  "conflict_unresolved",
  "policy_not_frozen",
  "multiple_valid_unfrozen",
  "unresolved_construct",
  "p1_ffmi_not_resolved",
  "incomplete_health_composition",
  "insufficient_core_constructs",
  "public_release_not_authorized",
] as const;

export const bodyCompositionScoreReasonCodeSchema = z.enum(BODY_COMPOSITION_SCORE_REASON_CODES);
export type BodyCompositionScoreReasonCode = z.infer<typeof bodyCompositionScoreReasonCodeSchema>;

export const bodyCompositionScoreAggregateStatusSchema = z.enum([
  "unavailable",
  "calculated_internal_not_public",
]);
export type BodyCompositionScoreAggregateStatus = z.infer<
  typeof bodyCompositionScoreAggregateStatusSchema
>;

export const bodyCompositionScoreSexSchema = z.enum(["male", "female"]);
export type BodyCompositionScoreSex = z.infer<typeof bodyCompositionScoreSexSchema>;

export const bodyCompositionScoreConstructResultSchema = z
  .object({
    /** null when withheld — never use 0 as missing. */
    value: z.number().finite().min(0).max(100).nullable(),
    /** null iff value is non-null. */
    primaryReason: bodyCompositionScoreReasonCodeSchema.nullable(),
  })
  .strip()
  .superRefine((value, ctx) => {
    if (value.value == null && value.primaryReason == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "withheld construct requires primaryReason",
        path: ["primaryReason"],
      });
    }
    if (value.value != null && value.primaryReason != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "available construct must have null primaryReason",
        path: ["primaryReason"],
      });
    }
  });

export type BodyCompositionScoreConstructResult = z.infer<
  typeof bodyCompositionScoreConstructResultSchema
>;

export const bodyCompositionHealthConstructScoresSchema = z
  .object({
    H1: bodyCompositionScoreConstructResultSchema,
    H2: bodyCompositionScoreConstructResultSchema,
    H3: bodyCompositionScoreConstructResultSchema,
  })
  .strip();

export type BodyCompositionHealthConstructScores = z.infer<
  typeof bodyCompositionHealthConstructScoresSchema
>;

export const bodyCompositionPerformanceConstructScoresSchema = z
  .object({
    P1: bodyCompositionScoreConstructResultSchema,
    P3: bodyCompositionScoreConstructResultSchema,
  })
  .strip();

export type BodyCompositionPerformanceConstructScores = z.infer<
  typeof bodyCompositionPerformanceConstructScoresSchema
>;

export const bodyCompositionHealthConstructReasonsSchema = z
  .object({
    H1: bodyCompositionScoreReasonCodeSchema.optional(),
    H2: bodyCompositionScoreReasonCodeSchema.optional(),
    H3: bodyCompositionScoreReasonCodeSchema.optional(),
  })
  .strip();

export type BodyCompositionHealthConstructReasons = z.infer<
  typeof bodyCompositionHealthConstructReasonsSchema
>;

export const bodyCompositionPerformanceConstructReasonsSchema = z
  .object({
    P1: bodyCompositionScoreReasonCodeSchema.optional(),
    P3: bodyCompositionScoreReasonCodeSchema.optional(),
  })
  .strip();

export type BodyCompositionPerformanceConstructReasons = z.infer<
  typeof bodyCompositionPerformanceConstructReasonsSchema
>;

export const bodyCompositionScoreEvidenceScopeSchema = z
  .object({
    mode: z.literal("caller_supplied_partial"),
    accountEvidenceClaim: z.literal("scoped_to_supplied_evidence_only"),
    completeness: bodyCompositionEvidenceCompletenessSchema,
  })
  .strip();

export type BodyCompositionScoreEvidenceScope = z.infer<
  typeof bodyCompositionScoreEvidenceScopeSchema
>;

const scoreNumberOrNull = z.number().finite().min(0).max(100).nullable();

function refineAggregateShape(
  value: {
    status: BodyCompositionScoreAggregateStatus;
    score: number | null;
    primaryReason: BodyCompositionScoreReasonCode | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (value.status === "unavailable") {
    if (value.score != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unavailable aggregate must have null score",
        path: ["score"],
      });
    }
    if (value.primaryReason == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unavailable aggregate requires primaryReason",
        path: ["primaryReason"],
      });
    }
  }
  if (value.status === "calculated_internal_not_public") {
    if (value.score == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "calculated_internal_not_public requires numeric score",
        path: ["score"],
      });
    }
    if (value.primaryReason != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "calculated_internal_not_public must have null primaryReason",
        path: ["primaryReason"],
      });
    }
  }
  if ("uid" in value || "userId" in value || "accountId" in value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "identity fields are forbidden on score output",
    });
  }
}

/**
 * Health Composition internal draft engine result.
 * Public exposure is NO-GO; status never means consumer-visible.
 */
export const bodyCompositionHealthScoreResultSchema = z
  .object({
    version: bodyCompositionHealthScoreVersionSchema,
    resolverVersion: z.literal(BODY_COMPOSITION_RESOLVER_VERSION),
    asOf: z.string().datetime(),
    status: bodyCompositionScoreAggregateStatusSchema,
    score: scoreNumberOrNull,
    primaryReason: bodyCompositionScoreReasonCodeSchema.nullable(),
    constructScores: bodyCompositionHealthConstructScoresSchema,
    constructReasons: bodyCompositionHealthConstructReasonsSchema,
    evidenceScope: bodyCompositionScoreEvidenceScopeSchema,
    /** Safe diagnostics tokens only — never health values / IDs / DOB. */
    diagnostics: z
      .object({
        engine: z.literal("health"),
        operation: z.string().min(1).max(80),
        status: bodyCompositionScoreAggregateStatusSchema,
        primaryReason: bodyCompositionScoreReasonCodeSchema.nullable(),
        availableConstructCount: z.number().int().nonnegative(),
        withheldConstructCount: z.number().int().nonnegative(),
        safeNotes: z.array(z.string().min(1).max(120)),
      })
      .strip(),
  })
  .strip()
  .superRefine(refineAggregateShape);

export type BodyCompositionHealthScoreResult = z.infer<
  typeof bodyCompositionHealthScoreResultSchema
>;

/**
 * Performance-Supporting Composition internal draft engine result.
 * Public exposure is NO-GO.
 */
export const bodyCompositionPerformanceSupportingScoreResultSchema = z
  .object({
    version: bodyCompositionPerformanceSupportingScoreVersionSchema,
    resolverVersion: z.literal(BODY_COMPOSITION_RESOLVER_VERSION),
    asOf: z.string().datetime(),
    status: bodyCompositionScoreAggregateStatusSchema,
    score: scoreNumberOrNull,
    primaryReason: bodyCompositionScoreReasonCodeSchema.nullable(),
    constructScores: bodyCompositionPerformanceConstructScoresSchema,
    constructReasons: bodyCompositionPerformanceConstructReasonsSchema,
    evidenceScope: bodyCompositionScoreEvidenceScopeSchema,
    diagnostics: z
      .object({
        engine: z.literal("performance_support"),
        operation: z.string().min(1).max(80),
        status: bodyCompositionScoreAggregateStatusSchema,
        primaryReason: bodyCompositionScoreReasonCodeSchema.nullable(),
        availableConstructCount: z.number().int().nonnegative(),
        withheldConstructCount: z.number().int().nonnegative(),
        safeNotes: z.array(z.string().min(1).max(120)),
      })
      .strip(),
  })
  .strip()
  .superRefine(refineAggregateShape);

export type BodyCompositionPerformanceSupportingScoreResult = z.infer<
  typeof bodyCompositionPerformanceSupportingScoreResultSchema
>;

/** Explicit public NO-GO constants — not calculation failures. */
export const BODY_COMPOSITION_HEALTH_SCORE_PUBLIC_STATUS = "NO-GO" as const;
export const BODY_COMPOSITION_PERFORMANCE_SUPPORTING_SCORE_PUBLIC_STATUS = "NO-GO" as const;
