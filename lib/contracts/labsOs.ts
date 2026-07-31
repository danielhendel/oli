/**
 * Labs OS contracts (Phase 3D-A).
 *
 * Additive on Document Ingestion OS. Parser candidates are never accepted health
 * truth. No auto-accept. No DailyFacts / Insights / canonical Lab events.
 */
import { z } from "zod";

const isoDatetimeString = z.string().datetime();

export const LABS_OS_SCHEMA_VERSION = "1.0.0" as const;
export const LABS_ALIAS_REGISTRY_VERSION = "1.0.0" as const;
export const LABS_UNIT_REGISTRY_VERSION = "1.0.0" as const;

export const labResultComparatorSchema = z.enum(["eq", "lt", "lte", "gt", "gte"]);

export const labQualitativeValueSchema = z.enum([
  "positive",
  "negative",
  "detected",
  "not_detected",
  "reactive",
  "non_reactive",
  "present",
  "absent",
  "other",
]);

export const labNotReportedReasonSchema = z.enum([
  "not_applicable",
  "not_ordered",
  "not_performed",
  "incomputable",
  "other",
]);

export const labResultValueSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("numeric"),
      value: z.number().finite(),
      comparator: labResultComparatorSchema,
    })
    .strip(),
  z
    .object({
      kind: z.literal("qualitative"),
      value: labQualitativeValueSchema,
      rawValue: z.string().min(1),
    })
    .strip(),
  z
    .object({
      kind: z.literal("pattern"),
      value: z.string().min(1),
    })
    .strip(),
  z
    .object({
      kind: z.literal("text"),
      value: z.string().min(1),
    })
    .strip(),
  z
    .object({
      kind: z.literal("not_reported"),
      reason: labNotReportedReasonSchema,
    })
    .strip(),
]);

export const labReferenceIntervalCandidateSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("numeric_range"),
      lower: z
        .object({
          value: z.number().finite(),
          inclusive: z.boolean(),
        })
        .strip()
        .optional(),
      upper: z
        .object({
          value: z.number().finite(),
          inclusive: z.boolean(),
        })
        .strip()
        .optional(),
      unit: z.string().min(1).optional(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("qualitative_expected"),
      expectedValues: z.array(z.string().min(1)).min(1),
    })
    .strip(),
  z
    .object({
      kind: z.literal("report_risk_categories"),
      categories: z
        .array(
          z
            .object({
              label: z.string().min(1),
              condition: z.string().min(1),
            })
            .strip(),
        )
        .min(1),
    })
    .strip(),
  z
    .object({
      kind: z.literal("raw_only"),
      raw: z.string().min(1),
    })
    .strip(),
]);

export const labNormalizedFlagSchema = z.enum([
  "high",
  "low",
  "critical_high",
  "critical_low",
  "abnormal",
  "normal",
  "positive",
  "negative",
  "provider_category",
  "none",
  "unknown",
]);

export const labFlagSourceSchema = z.enum(["report_flag", "calculated_from_report_range"]);

export const labFlagCandidateSchema = z
  .object({
    rawFlag: z.string().nullable(),
    normalized: labNormalizedFlagSchema,
    source: labFlagSourceSchema,
    confidence: z.number().min(0).max(1),
  })
  .strip();

export const labAliasMatchMethodSchema = z.enum([
  "exact_canonical",
  "exact_alias",
  "normalized_exact",
  "deterministic_pattern",
  "unmatched",
]);

export const labAliasMatchSchema = z
  .object({
    canonicalMetricId: z.string().min(1).nullable(),
    matchMethod: labAliasMatchMethodSchema,
    aliasVersion: z.string().min(1),
    confidence: z.number().min(0).max(1),
    requiresReview: z.boolean(),
  })
  .strip();

export const labUnitCandidateSchema = z
  .object({
    rawUnit: z.string().nullable(),
    normalizedUnit: z.string().nullable(),
    unitRegistryVersion: z.string().min(1),
    confidence: z.number().min(0).max(1),
    known: z.boolean(),
  })
  .strip();

export const labLaboratoryReferenceSchema = z
  .object({
    code: z.string().min(1).nullable().optional(),
    name: z.string().min(1).nullable().optional(),
  })
  .strip();

export const labMethodReferenceSchema = z
  .object({
    assayMethod: z.string().min(1).nullable().optional(),
    calculated: z.boolean().nullable().optional(),
    specimenType: z.string().min(1).nullable().optional(),
    fasting: z.boolean().nullable().optional(),
    noteRef: z.string().min(1).nullable().optional(),
  })
  .strip();

export const labResultProvenanceSchema = z
  .object({
    sourceDocumentId: z.string().min(1),
    sourcePage: z.number().int().positive(),
    sourceLocator: z.string().min(1),
    sourceChecksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    parserId: z.string().min(1),
    parserVersion: z.string().min(1),
    extractionVersion: z.string().min(1),
    panelName: z.string().min(1).nullable().optional(),
    resultRole: z.enum(["current", "historical_column", "summary", "detail", "unknown"]).optional(),
  })
  .strip();

export const labCandidateReviewStatusSchema = z.enum([
  "pending",
  "accepted",
  "corrected",
  "rejected",
  "unresolved",
]);

export const labReportReviewStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "ready_to_accept",
  "accepted",
  "rejected",
  "superseded",
]);

export const labExtractionDraftStatusSchema = z.enum([
  "extracted",
  "partial",
  "review_needed",
  "unsupported",
  "failed",
]);

export const labExtractionWarningCodeSchema = z.enum([
  "unsupported_layout",
  "scanned_pdf_no_text",
  "encrypted_pdf",
  "partial_page_text",
  "ambiguous_analyte",
  "ambiguous_value",
  "ambiguous_unit",
  "ambiguous_reference_range",
  "ambiguous_flag",
  "duplicate_candidate",
  "conflicting_report_date",
  "unsupported_result_type",
  "page_count_mismatch",
  "low_confidence",
  "method_note_unresolved",
]);

export const labExtractionWarningSchema = z
  .object({
    code: labExtractionWarningCodeSchema,
    message: z.string().min(1),
    candidateId: z.string().min(1).optional(),
    pageNumber: z.number().int().positive().optional(),
  })
  .strip();

export const labReportMetadataCandidateSchema = z
  .object({
    reportStatus: z.string().min(1).nullable().optional(),
    collectedAt: isoDatetimeString.nullable().optional(),
    receivedAt: isoDatetimeString.nullable().optional(),
    reportedAt: isoDatetimeString.nullable().optional(),
    fasting: z.boolean().nullable().optional(),
    laboratoryName: z.string().min(1).nullable().optional(),
    performingLaboratories: z.array(labLaboratoryReferenceSchema).optional(),
    specimenType: z.string().min(1).nullable().optional(),
    panelNames: z.array(z.string().min(1)).optional(),
    reportFamily: z.string().min(1).nullable().optional(),
    formatFamilyVersion: z.string().min(1).nullable().optional(),
    pageCount: z.number().int().nonnegative().nullable().optional(),
    confidence: z.number().min(0).max(1),
    fieldConfidence: z.record(z.string(), z.number().min(0).max(1)).optional(),
  })
  .strip();

export const labPanelCandidateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    sourcePage: z.number().int().positive(),
    laboratory: labLaboratoryReferenceSchema.nullable().optional(),
  })
  .strip();

export const labResultCandidateSchema = z
  .object({
    id: z.string().min(1),
    rawAnalyteLabel: z.string().min(1),
    rawResult: z.string().min(1),
    result: labResultValueSchema.nullable(),
    unit: labUnitCandidateSchema,
    rawReferenceRange: z.string().nullable(),
    structuredReferenceRange: labReferenceIntervalCandidateSchema.nullable(),
    flag: labFlagCandidateSchema,
    panelId: z.string().min(1).nullable(),
    aliasMatch: labAliasMatchSchema,
    method: labMethodReferenceSchema.nullable().optional(),
    laboratory: labLaboratoryReferenceSchema.nullable().optional(),
    provenance: labResultProvenanceSchema,
    confidence: z.number().min(0).max(1),
    warnings: z.array(labExtractionWarningCodeSchema),
    reviewStatus: labCandidateReviewStatusSchema,
  })
  .strip();

export const labUnmatchedCandidateSchema = z
  .object({
    id: z.string().min(1),
    rawAnalyteLabel: z.string().min(1),
    rawResult: z.string().min(1),
    reason: z.enum(["unmatched_alias", "ambiguous_alias", "unsupported_result_type", "historical_column"]),
    provenance: labResultProvenanceSchema,
    confidence: z.number().min(0).max(1),
    reviewStatus: labCandidateReviewStatusSchema,
  })
  .strip();

export const labExtractionDraftSchema = z
  .object({
    schemaVersion: z.literal(LABS_OS_SCHEMA_VERSION),
    id: z.string().min(1),
    documentId: z.string().min(1),
    userId: z.string().min(1),
    reportCandidate: labReportMetadataCandidateSchema,
    panels: z.array(labPanelCandidateSchema),
    results: z.array(labResultCandidateSchema),
    unmatched: z.array(labUnmatchedCandidateSchema),
    warnings: z.array(labExtractionWarningSchema),
    parser: z
      .object({
        id: z.string().min(1),
        version: z.string().min(1),
        extractionVersion: z.string().min(1),
      })
      .strip(),
    sourceChecksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    status: labExtractionDraftStatusSchema,
    createdAt: isoDatetimeString,
    superseded: z.boolean().optional(),
    jobId: z.string().min(1).optional(),
  })
  .strip();

export const labCandidateCorrectionSchema = z
  .object({
    candidateId: z.string().min(1),
    correctedAt: isoDatetimeString,
    reviewerType: z.literal("user"),
    fields: z
      .object({
        canonicalMetricId: z.string().min(1).nullable().optional(),
        result: labResultValueSchema.optional(),
        rawUnit: z.string().nullable().optional(),
        normalizedUnit: z.string().nullable().optional(),
        rawReferenceRange: z.string().nullable().optional(),
        rawFlag: z.string().nullable().optional(),
        normalizedFlag: labNormalizedFlagSchema.optional(),
        collectedAt: isoDatetimeString.nullable().optional(),
        fasting: z.boolean().nullable().optional(),
        panelId: z.string().min(1).nullable().optional(),
      })
      .strip(),
  })
  .strip();

export const labReviewRecordSchema = z
  .object({
    schemaVersion: z.literal(LABS_OS_SCHEMA_VERSION),
    id: z.string().min(1),
    documentId: z.string().min(1),
    userId: z.string().min(1),
    draftId: z.string().min(1),
    status: labReportReviewStatusSchema,
    reviewVersion: z.number().int().nonnegative(),
    candidateStatuses: z.record(z.string(), labCandidateReviewStatusSchema),
    corrections: z.array(labCandidateCorrectionSchema),
    createdAt: isoDatetimeString,
    updatedAt: isoDatetimeString,
    acceptedAt: isoDatetimeString.nullable().optional(),
  })
  .strip();

export const acceptedLabResultSchema = z
  .object({
    schemaVersion: z.literal(LABS_OS_SCHEMA_VERSION),
    id: z.string().min(1),
    userId: z.string().min(1),
    sourceDocumentId: z.string().min(1),
    sourceExtractionId: z.string().min(1),
    sourceCandidateId: z.string().min(1),
    canonicalMetricId: z.string().min(1).nullable(),
    rawAnalyteLabel: z.string().min(1),
    panelId: z.string().min(1).nullable(),
    collectedAt: isoDatetimeString.nullable(),
    reportedAt: isoDatetimeString.nullable(),
    fasting: z.boolean().nullable(),
    result: labResultValueSchema,
    rawUnit: z.string().nullable(),
    normalizedUnit: z.string().nullable(),
    rawReferenceRange: z.string().nullable(),
    structuredReferenceRange: labReferenceIntervalCandidateSchema.nullable(),
    rawFlag: z.string().nullable(),
    normalizedFlag: labNormalizedFlagSchema.nullable(),
    laboratory: labLaboratoryReferenceSchema.nullable(),
    method: labMethodReferenceSchema.nullable(),
    provenance: labResultProvenanceSchema,
    review: z
      .object({
        status: z.enum(["accepted", "corrected"]),
        acceptedAt: isoDatetimeString,
        reviewVersion: z.string().min(1),
      })
      .strip(),
    parser: z
      .object({
        id: z.string().min(1),
        version: z.string().min(1),
        extractionVersion: z.string().min(1),
      })
      .strip(),
    createdAt: isoDatetimeString,
  })
  .strip();

/** Safe consumer DTO — no checksums, storage paths, or patient identifiers. */
export const labReviewSummaryDtoSchema = z
  .object({
    documentId: z.string().min(1),
    safeDisplayFilename: z.string().min(1),
    status: labReportReviewStatusSchema,
    documentStatus: z.string().min(1),
    collectedAt: isoDatetimeString.nullable().optional(),
    reportedAt: isoDatetimeString.nullable().optional(),
    fasting: z.boolean().nullable().optional(),
    laboratoryName: z.string().min(1).nullable().optional(),
    matchedCount: z.number().int().nonnegative(),
    unmatchedCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    extractionVersion: z.string().min(1).nullable().optional(),
    reviewVersion: z.number().int().nonnegative(),
  })
  .strip();

export const labReviewCandidateDtoSchema = z
  .object({
    id: z.string().min(1),
    rawAnalyteLabel: z.string().min(1),
    displayName: z.string().min(1).nullable(),
    canonicalMetricId: z.string().min(1).nullable(),
    rawResult: z.string().min(1),
    result: labResultValueSchema.nullable(),
    unit: z.string().nullable(),
    rawReferenceRange: z.string().nullable(),
    flagLabel: z.string().nullable(),
    panelName: z.string().nullable(),
    sourcePage: z.number().int().positive(),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string().min(1)),
    reviewStatus: labCandidateReviewStatusSchema,
    matchGroup: z.enum(["matched", "needs_review", "unmatched"]),
  })
  .strip();

export const labReviewDetailDtoSchema = z
  .object({
    ok: z.literal(true),
    summary: labReviewSummaryDtoSchema,
    metadata: labReportMetadataCandidateSchema,
    candidates: z.array(labReviewCandidateDtoSchema),
    unmatched: z.array(labReviewCandidateDtoSchema),
    warningMessages: z.array(z.string().min(1)),
  })
  .strip();

export const labHistoryPointDtoSchema = z
  .object({
    id: z.string().min(1),
    canonicalMetricId: z.string().min(1).nullable(),
    collectedAt: isoDatetimeString.nullable(),
    result: labResultValueSchema,
    rawUnit: z.string().nullable(),
    normalizedUnit: z.string().nullable(),
    rawReferenceRange: z.string().nullable(),
    normalizedFlag: labNormalizedFlagSchema.nullable(),
    laboratoryName: z.string().nullable().optional(),
    sourceDocumentId: z.string().min(1),
    sourcePage: z.number().int().positive(),
    methodCompatibility: z.enum(["compatible", "uncertain", "incompatible"]),
    trendEligible: z.boolean(),
  })
  .strip();

export const labAnalyteHistoryDtoSchema = z
  .object({
    ok: z.literal(true),
    canonicalMetricId: z.string().min(1),
    displayName: z.string().min(1),
    points: z.array(labHistoryPointDtoSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export const patchLabReviewCandidateRequestSchema = z
  .object({
    reviewVersion: z.number().int().nonnegative(),
    reviewStatus: labCandidateReviewStatusSchema.optional(),
    correction: labCandidateCorrectionSchema.shape.fields.optional(),
  })
  .strip();

export const acceptLabReviewRequestSchema = z
  .object({
    reviewVersion: z.number().int().nonnegative(),
    candidateIds: z.array(z.string().min(1)).optional(),
    confirmAcceptSelected: z.literal(true),
  })
  .strip();

export const rejectLabReviewRequestSchema = z
  .object({
    reviewVersion: z.number().int().nonnegative(),
    candidateIds: z.array(z.string().min(1)).min(1),
  })
  .strip();

export const labReviewsListResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    items: z.array(labReviewSummaryDtoSchema),
  })
  .strip();

export const patchLabReviewCandidateResponseSchema = z
  .object({
    ok: z.literal(true),
    reviewVersion: z.number().int().nonnegative(),
  })
  .strip();

export const acceptLabReviewResponseSchema = z
  .object({
    ok: z.literal(true),
    acceptedCount: z.number().int().nonnegative(),
    acceptedIds: z.array(z.string().min(1)),
    unresolvedCount: z.number().int().nonnegative(),
    reviewVersion: z.number().int().nonnegative(),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export const rejectLabReviewResponseSchema = z
  .object({
    ok: z.literal(true),
    reviewVersion: z.number().int().nonnegative(),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export type LabResultValue = z.infer<typeof labResultValueSchema>;
export type LabReferenceIntervalCandidate = z.infer<typeof labReferenceIntervalCandidateSchema>;
export type LabFlagCandidate = z.infer<typeof labFlagCandidateSchema>;
export type LabAliasMatch = z.infer<typeof labAliasMatchSchema>;
export type LabUnitCandidate = z.infer<typeof labUnitCandidateSchema>;
export type LabPanelCandidate = z.infer<typeof labPanelCandidateSchema>;
export type LabResultCandidate = z.infer<typeof labResultCandidateSchema>;
export type LabUnmatchedCandidate = z.infer<typeof labUnmatchedCandidateSchema>;
export type LabExtractionDraft = z.infer<typeof labExtractionDraftSchema>;
export type LabReviewRecord = z.infer<typeof labReviewRecordSchema>;
export type AcceptedLabResult = z.infer<typeof acceptedLabResultSchema>;
export type LabReviewSummaryDto = z.infer<typeof labReviewSummaryDtoSchema>;
export type LabReviewCandidateDto = z.infer<typeof labReviewCandidateDtoSchema>;
export type LabReviewsListResponseDto = z.infer<typeof labReviewsListResponseDtoSchema>;
export type LabReviewDetailDto = z.infer<typeof labReviewDetailDtoSchema>;
export type PatchLabReviewCandidateRequest = z.infer<typeof patchLabReviewCandidateRequestSchema>;
export type AcceptLabReviewRequest = z.infer<typeof acceptLabReviewRequestSchema>;
export type RejectLabReviewRequest = z.infer<typeof rejectLabReviewRequestSchema>;
export type LabAnalyteHistoryDto = z.infer<typeof labAnalyteHistoryDtoSchema>;
export type LabHistoryPointDto = z.infer<typeof labHistoryPointDtoSchema>;
export type LabNormalizedFlag = z.infer<typeof labNormalizedFlagSchema>;
export type LabExtractionWarningCode = z.infer<typeof labExtractionWarningCodeSchema>;
export type LabResultProvenance = z.infer<typeof labResultProvenanceSchema>;
export type LabReportMetadataCandidate = z.infer<typeof labReportMetadataCandidateSchema>;
export type LabCandidateReviewStatus = z.infer<typeof labCandidateReviewStatusSchema>;
export type LabReportReviewStatus = z.infer<typeof labReportReviewStatusSchema>;
export type LabExtractionWarning = z.infer<typeof labExtractionWarningSchema>;
export type LabCandidateCorrection = z.infer<typeof labCandidateCorrectionSchema>;
export type LabLaboratoryReference = z.infer<typeof labLaboratoryReferenceSchema>;
export type LabMethodReference = z.infer<typeof labMethodReferenceSchema>;
