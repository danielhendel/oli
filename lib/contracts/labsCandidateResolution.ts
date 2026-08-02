/**
 * Labs candidate resolution contracts (Phase 3D-A catalog completion).
 * Every extracted candidate receives exactly one typed resolution.
 */
import { z } from "zod";

export const LAB_CANDIDATE_RESOLUTION_POLICY_VERSION = "1.0.0" as const;
export const LAB_CATALOG_SCHEMA_VERSION = "1.2.0" as const;

export const labCandidateResolutionKindSchema = z.enum([
  "current_result",
  "historical_result",
  "duplicate_result",
  "panel_header",
  "reference_table",
  "risk_category",
  "method_note",
  "report_note",
  "laboratory_metadata",
  "unsupported_true_analyte",
  "malformed",
]);

export const labCandidateIdentityMethodSchema = z.enum([
  "exact_canonical",
  "exact_alias",
  "provider_alias",
  "panel_context",
  "calculated_profile",
]);

export const labDuplicateReasonSchema = z.enum([
  "summary_and_detail",
  "repeated_panel",
  "repeated_page",
  "same_source_locator",
]);

export const labUnsupportedAnalyteReasonSchema = z.enum([
  "no_canonical_metric",
  "unsupported_result_kind",
  "method_identity_unresolved",
  "specimen_identity_unresolved",
]);

export const labMalformedReasonSchema = z.enum([
  "row_alignment_failed",
  "value_missing",
  "identity_ambiguous",
  "source_conflict",
]);

export const labCandidateResolutionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("current_result"),
      canonicalMetricId: z.string().min(1),
      identityMethod: labCandidateIdentityMethodSchema,
      confidence: z.literal(1),
      calculatedStatus: z.enum(["measured", "calculated", "either"]).optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("historical_result"),
      canonicalMetricId: z.string().min(1).nullable(),
      relatedCurrentCandidateId: z.string().min(1).nullable(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("duplicate_result"),
      canonicalCandidateId: z.string().min(1),
      duplicateReason: labDuplicateReasonSchema,
      canonicalMetricId: z.string().min(1).nullable().optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("panel_header"),
      panelId: z.string().min(1).nullable(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("reference_table"),
      relatedMetricId: z.string().min(1).nullable(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("risk_category"),
      relatedMetricId: z.string().min(1).nullable(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("method_note"),
      relatedMetricId: z.string().min(1).nullable(),
    })
    .strip(),
  z.object({ kind: z.literal("report_note") }).strip(),
  z.object({ kind: z.literal("laboratory_metadata") }).strip(),
  z
    .object({
      kind: z.literal("unsupported_true_analyte"),
      normalizedLabel: z.string().min(1),
      reason: labUnsupportedAnalyteReasonSchema,
    })
    .strip(),
  z
    .object({
      kind: z.literal("malformed"),
      reason: labMalformedReasonSchema,
    })
    .strip(),
]);

export const labCandidateResolutionRecordSchema = z
  .object({
    candidateId: z.string().min(1),
    resolution: labCandidateResolutionSchema,
    policyVersion: z.literal(LAB_CANDIDATE_RESOLUTION_POLICY_VERSION),
    catalogVersion: z.literal(LAB_CATALOG_SCHEMA_VERSION).optional(),
  })
  .strip();

/** Structural accounting — counts must sum to total extracted candidates. */
export const labCandidateResolutionAccountingSchema = z
  .object({
    policyVersion: z.literal(LAB_CANDIDATE_RESOLUTION_POLICY_VERSION),
    totalExtractedCandidates: z.number().int().nonnegative(),
    mappedCurrentResults: z.number().int().nonnegative(),
    mappedCalculatedResults: z.number().int().nonnegative(),
    mappedQualitativeResults: z.number().int().nonnegative(),
    mappedInequalityResults: z.number().int().nonnegative(),
    duplicateRows: z.number().int().nonnegative(),
    historicalRows: z.number().int().nonnegative(),
    panelHeaders: z.number().int().nonnegative(),
    reportNotes: z.number().int().nonnegative(),
    methodNotes: z.number().int().nonnegative(),
    riskCategoryRows: z.number().int().nonnegative(),
    referenceOnlyRows: z.number().int().nonnegative(),
    laboratoryMetadataRows: z.number().int().nonnegative(),
    unsupportedTrueAnalytes: z.number().int().nonnegative(),
    malformedRows: z.number().int().nonnegative(),
    unclassified: z.number().int().nonnegative(),
    importedCount: z.number().int().nonnegative().optional(),
    systemVerifiedCount: z.number().int().nonnegative().optional(),
    withheldCount: z.number().int().nonnegative().optional(),
  })
  .strip();

export type LabCandidateResolution = z.infer<typeof labCandidateResolutionSchema>;
export type LabCandidateResolutionRecord = z.infer<typeof labCandidateResolutionRecordSchema>;
export type LabCandidateResolutionAccounting = z.infer<typeof labCandidateResolutionAccountingSchema>;

/** Assert accounting is complete (unclassified = 0 and parts sum to total). */
export function assertLabCandidateAccountingComplete(
  accounting: LabCandidateResolutionAccounting,
): boolean {
  const sum =
    accounting.mappedCurrentResults +
    accounting.mappedCalculatedResults +
    accounting.mappedQualitativeResults +
    accounting.mappedInequalityResults +
    accounting.duplicateRows +
    accounting.historicalRows +
    accounting.panelHeaders +
    accounting.reportNotes +
    accounting.methodNotes +
    accounting.riskCategoryRows +
    accounting.referenceOnlyRows +
    accounting.laboratoryMetadataRows +
    accounting.unsupportedTrueAnalytes +
    accounting.malformedRows;
  // Current/calculated/qualitative/inequality are overlapping facets of current_result —
  // use exclusive buckets for the completeness check via exclusiveTotal below.
  void sum;
  const exclusive =
    accounting.mappedCurrentResults +
    accounting.duplicateRows +
    accounting.historicalRows +
    accounting.panelHeaders +
    accounting.reportNotes +
    accounting.methodNotes +
    accounting.riskCategoryRows +
    accounting.referenceOnlyRows +
    accounting.laboratoryMetadataRows +
    accounting.unsupportedTrueAnalytes +
    accounting.malformedRows;
  return accounting.unclassified === 0 && exclusive === accounting.totalExtractedCandidates;
}
