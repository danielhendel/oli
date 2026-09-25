/**
 * Body Scans contracts (Stage 3E).
 *
 * Periodic body-composition assessments (DXA/InBody/Evolt/Bod Pod). Built on top of
 * Document Ingestion OS (`documents.ts`, domain `scans`) — scans never introduce a
 * parallel upload/storage stack.
 *
 * Hard boundaries encoded here:
 * - Scan metrics are their own fact space. They are NOT weight / body fat / lean mass
 *   measurements and must never be merged into those continuous trends.
 * - Missing is missing. Optional numeric values are `null`, never coerced to zero.
 * - Consumer DTOs never carry storage paths, UIDs, checksums, or signed URLs.
 */
import { z } from "zod";

const isoDatetimeString = z.string().datetime();

export const BODY_SCAN_SCHEMA_VERSION = "1.0.0" as const;

/** User-facing scan products supported in V1. */
export const bodyScanTypeSchema = z.enum(["dxa", "inbody", "evolt", "bod_pod", "other"]);

/** Measurement physics behind a scan. Never treat two methods as interchangeable. */
export const bodyScanMethodSchema = z.enum(["dxa", "bia", "air_displacement", "other"]);

export const bodyScanStatusSchema = z.enum([
  "uploading",
  "processing",
  "needs_review",
  "verified",
  "failed",
  "deleting",
  "deleted",
]);

/**
 * Metric kinds. Region is modelled separately so a DXA report can express e.g.
 * `fat_percent` at `android` and at `left_arm` without a combinatorial enum.
 */
export const bodyScanMetricIdSchema = z.enum([
  "fat_percent",
  "fat_mass",
  "lean_mass",
  "total_mass",
  "bone_mineral_content",
  "bone_mineral_density",
  "visceral_fat_mass",
  "android_gynoid_ratio",
]);

export const bodyScanRegionSchema = z.enum([
  "total",
  "head",
  "trunk",
  "android",
  "gynoid",
  "arms",
  "legs",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
]);

export const bodyScanUnitSchema = z.enum(["percent", "kg", "lb", "g", "g_per_cm2", "ratio"]);

/** Designed detail sections. `source` is provenance, not a metric section. */
export const bodyScanSectionIdSchema = z.enum([
  "overview",
  "fat_distribution",
  "regional_composition",
  "regional_lean_balance",
  "total_body_bone",
  "source",
]);

export const bodyScanDraftStatusSchema = z.enum([
  "extracted",
  "review_needed",
  "partial",
  "unsupported",
  "failed",
]);

export const bodyScanDeviceSchema = z
  .object({
    manufacturer: z.string().min(1).max(120).nullable(),
    model: z.string().min(1).max(120).nullable(),
  })
  .strip();

export const bodyScanAdapterRefSchema = z
  .object({
    id: z.string().min(1).max(120),
    version: z.string().min(1).max(40),
  })
  .strip();

/**
 * Provenance carried by every confirmed metric so comparability and corrections stay auditable.
 * `comparabilityGroup` is the only key allowed for future scan-to-scan comparison, and is
 * deliberately method + vendor + metric scoped (e.g. `dxa:ge-lunar:fat_percent:total`).
 */
export const bodyScanMetricProvenanceSchema = z
  .object({
    scanId: z.string().min(1),
    documentId: z.string().min(1),
    adapterId: z.string().min(1),
    adapterVersion: z.string().min(1),
    pageNumber: z.number().int().positive().nullable(),
    rawLabel: z.string().min(1).max(200).nullable(),
    sourceLocator: z.string().max(200).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    /** True when the user changed the extracted value during review. */
    corrected: z.boolean(),
  })
  .strip();

export const bodyScanMetricSchema = z
  .object({
    metricId: bodyScanMetricIdSchema,
    region: bodyScanRegionSchema,
    value: z.number().finite(),
    unit: bodyScanUnitSchema,
    method: bodyScanMethodSchema,
    comparabilityGroup: z.string().min(1).max(160),
    provenance: bodyScanMetricProvenanceSchema,
  })
  .strip();

export const bodyScanExtractedFieldSchema = z
  .object({
    fieldId: z.string().min(1).max(160),
    metricId: bodyScanMetricIdSchema,
    region: bodyScanRegionSchema,
    rawLabel: z.string().min(1).max(200),
    rawValue: z.string().min(1).max(200),
    /** Missing stays missing — never default to 0. */
    normalizedValue: z.number().finite().nullable(),
    unit: bodyScanUnitSchema,
    pageNumber: z.number().int().positive().nullable(),
    sourceLocator: z.string().max(200).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    requiresReview: z.boolean(),
    warningCodes: z.array(z.string().min(1).max(80)),
  })
  .strip();

export const bodyScanExtractionWarningSchema = z
  .object({
    code: z.string().min(1).max(80),
    message: z.string().min(1).max(300),
    fieldId: z.string().min(1).max(160).optional(),
  })
  .strip();

/** Adapter output. An extraction draft is a candidate, never confirmed truth. */
export const bodyScanExtractionDraftSchema = z
  .object({
    schemaVersion: z.literal(BODY_SCAN_SCHEMA_VERSION),
    id: z.string().min(1),
    userId: z.string().min(1),
    scanId: z.string().min(1),
    documentId: z.string().min(1),
    jobId: z.string().min(1).nullable(),
    adapter: bodyScanAdapterRefSchema,
    status: bodyScanDraftStatusSchema,
    scanTypeCandidate: bodyScanTypeSchema,
    methodCandidate: bodyScanMethodSchema,
    device: bodyScanDeviceSchema,
    performedAtCandidate: isoDatetimeString.nullable(),
    pagesProcessed: z.number().int().nonnegative(),
    pageCount: z.number().int().nonnegative().nullable(),
    fields: z.array(bodyScanExtractedFieldSchema),
    warnings: z.array(bodyScanExtractionWarningSchema),
    confidenceSummary: z
      .object({
        overall: z.number().min(0).max(1).nullable(),
        lowConfidenceFieldCount: z.number().int().nonnegative(),
      })
      .strip(),
    sourceDocumentChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    superseded: z.boolean(),
    createdAt: isoDatetimeString,
    updatedAt: isoDatetimeString,
  })
  .strip();

/** Durable server record. Not a consumer DTO (carries userId / documentId linkage). */
export const bodyScanRecordSchema = z
  .object({
    schemaVersion: z.literal(BODY_SCAN_SCHEMA_VERSION),
    id: z.string().min(1),
    userId: z.string().min(1),
    documentId: z.string().min(1),
    scanType: bodyScanTypeSchema,
    method: bodyScanMethodSchema,
    device: bodyScanDeviceSchema,
    performedAt: isoDatetimeString.nullable(),
    status: bodyScanStatusSchema,
    adapter: bodyScanAdapterRefSchema.nullable(),
    extractionDraftId: z.string().min(1).nullable(),
    metrics: z.array(bodyScanMetricSchema),
    reviewedAt: isoDatetimeString.nullable(),
    correctionCount: z.number().int().nonnegative(),
    failureCode: z.string().min(1).max(80).nullable(),
    retentionStatus: z.enum(["active", "pending_delete", "deleted"]),
    createdAt: isoDatetimeString,
    updatedAt: isoDatetimeString,
  })
  .strip();

/**
 * Immutable governed fact emitted on confirm. Deliberately separate from
 * `bodyComposition` raw events so scan values can never reach continuous trends.
 */
export const bodyScanFactSchema = z
  .object({
    schemaVersion: z.literal(BODY_SCAN_SCHEMA_VERSION),
    id: z.string().min(1),
    userId: z.string().min(1),
    scanId: z.string().min(1),
    documentId: z.string().min(1),
    scanType: bodyScanTypeSchema,
    method: bodyScanMethodSchema,
    performedAt: isoDatetimeString.nullable(),
    confirmedAt: isoDatetimeString,
    metrics: z.array(bodyScanMetricSchema),
    /** Guard flag asserted by invariants: scan facts are never continuous-tracking truth. */
    excludedFromContinuousTrends: z.literal(true),
  })
  .strip();

// ---------------------------------------------------------------------------
// Consumer DTOs
// ---------------------------------------------------------------------------

export const bodyScanListItemDtoSchema = z
  .object({
    id: z.string().min(1),
    scanType: bodyScanTypeSchema,
    method: bodyScanMethodSchema,
    status: bodyScanStatusSchema,
    performedAt: isoDatetimeString.nullable(),
    uploadedAt: isoDatetimeString,
    deviceLabel: z.string().min(1).max(200).nullable(),
    statusLabel: z.string().min(1).max(120),
    metricCount: z.number().int().nonnegative(),
    canReview: z.boolean(),
    canRetry: z.boolean(),
    canDelete: z.boolean(),
    canViewOriginal: z.boolean(),
  })
  .strip();

export const bodyScansListResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    items: z.array(bodyScanListItemDtoSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export const bodyScanMetricDtoSchema = z
  .object({
    metricId: bodyScanMetricIdSchema,
    region: bodyScanRegionSchema,
    value: z.number().finite(),
    unit: bodyScanUnitSchema,
    rawLabel: z.string().min(1).max(200).nullable(),
    corrected: z.boolean(),
  })
  .strip();

export const bodyScanDetailDtoSchema = z
  .object({
    id: z.string().min(1),
    scanType: bodyScanTypeSchema,
    method: bodyScanMethodSchema,
    status: bodyScanStatusSchema,
    statusLabel: z.string().min(1).max(120),
    performedAt: isoDatetimeString.nullable(),
    uploadedAt: isoDatetimeString,
    deviceLabel: z.string().min(1).max(200).nullable(),
    adapterLabel: z.string().min(1).max(200).nullable(),
    sourceFilename: z.string().min(1).max(255),
    metrics: z.array(bodyScanMetricDtoSchema),
    safeWarnings: z.array(z.string().min(1).max(300)),
    canReview: z.boolean(),
    canRetry: z.boolean(),
    canDelete: z.boolean(),
    canViewOriginal: z.boolean(),
  })
  .strip();

export const bodyScanDetailResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    scan: bodyScanDetailDtoSchema,
  })
  .strip();

export const bodyScanReviewFieldDtoSchema = z
  .object({
    fieldId: z.string().min(1).max(160),
    metricId: bodyScanMetricIdSchema,
    region: bodyScanRegionSchema,
    label: z.string().min(1).max(200),
    rawValue: z.string().min(1).max(200),
    normalizedValue: z.number().finite().nullable(),
    unit: bodyScanUnitSchema,
    confidence: z.number().min(0).max(1).nullable(),
    requiresReview: z.boolean(),
  })
  .strip();

export const bodyScanReviewResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    scanId: z.string().min(1),
    status: bodyScanStatusSchema,
    scanType: bodyScanTypeSchema,
    method: bodyScanMethodSchema,
    performedAt: isoDatetimeString.nullable(),
    deviceLabel: z.string().min(1).max(200).nullable(),
    adapterLabel: z.string().min(1).max(200).nullable(),
    fields: z.array(bodyScanReviewFieldDtoSchema),
    safeWarnings: z.array(z.string().min(1).max(300)),
    /** True when no adapter produced usable fields — manual review only. */
    manualReviewOnly: z.boolean(),
    confirmAvailable: z.boolean(),
  })
  .strip();

export const bodyScanFieldCorrectionDtoSchema = z
  .object({
    fieldId: z.string().min(1).max(160),
    /** null explicitly marks the field as missing (accepted) rather than zero. */
    value: z.number().finite().nullable(),
  })
  .strip();

export const bodyScanConfirmRequestDtoSchema = z
  .object({
    scanType: bodyScanTypeSchema.optional(),
    performedAt: isoDatetimeString.nullable().optional(),
    corrections: z.array(bodyScanFieldCorrectionDtoSchema).max(200).optional(),
    /** Fields the user explicitly acknowledged; required for low-confidence fields. */
    acknowledgedFieldIds: z.array(z.string().min(1).max(160)).max(200).optional(),
  })
  .strip();

export const bodyScanConfirmResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    scanId: z.string().min(1),
    status: bodyScanStatusSchema,
    metricCount: z.number().int().nonnegative(),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export const bodyScanReprocessResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    scanId: z.string().min(1),
    status: bodyScanStatusSchema,
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export const bodyScanDeleteResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    scanId: z.string().min(1),
    deleted: z.literal(true),
  })
  .strip();

export type BodyScanType = z.infer<typeof bodyScanTypeSchema>;
export type BodyScanMethod = z.infer<typeof bodyScanMethodSchema>;
export type BodyScanStatus = z.infer<typeof bodyScanStatusSchema>;
export type BodyScanMetricId = z.infer<typeof bodyScanMetricIdSchema>;
export type BodyScanRegion = z.infer<typeof bodyScanRegionSchema>;
export type BodyScanUnit = z.infer<typeof bodyScanUnitSchema>;
export type BodyScanSectionId = z.infer<typeof bodyScanSectionIdSchema>;
export type BodyScanDraftStatus = z.infer<typeof bodyScanDraftStatusSchema>;
export type BodyScanDevice = z.infer<typeof bodyScanDeviceSchema>;
export type BodyScanAdapterRef = z.infer<typeof bodyScanAdapterRefSchema>;
export type BodyScanMetricProvenance = z.infer<typeof bodyScanMetricProvenanceSchema>;
export type BodyScanMetric = z.infer<typeof bodyScanMetricSchema>;
export type BodyScanExtractedField = z.infer<typeof bodyScanExtractedFieldSchema>;
export type BodyScanExtractionWarning = z.infer<typeof bodyScanExtractionWarningSchema>;
export type BodyScanExtractionDraft = z.infer<typeof bodyScanExtractionDraftSchema>;
export type BodyScanRecord = z.infer<typeof bodyScanRecordSchema>;
export type BodyScanFact = z.infer<typeof bodyScanFactSchema>;
export type BodyScanListItemDto = z.infer<typeof bodyScanListItemDtoSchema>;
export type BodyScansListResponseDto = z.infer<typeof bodyScansListResponseDtoSchema>;
export type BodyScanMetricDto = z.infer<typeof bodyScanMetricDtoSchema>;
export type BodyScanDetailDto = z.infer<typeof bodyScanDetailDtoSchema>;
export type BodyScanDetailResponseDto = z.infer<typeof bodyScanDetailResponseDtoSchema>;
export type BodyScanReviewFieldDto = z.infer<typeof bodyScanReviewFieldDtoSchema>;
export type BodyScanReviewResponseDto = z.infer<typeof bodyScanReviewResponseDtoSchema>;
export type BodyScanFieldCorrectionDto = z.infer<typeof bodyScanFieldCorrectionDtoSchema>;
export type BodyScanConfirmRequestDto = z.infer<typeof bodyScanConfirmRequestDtoSchema>;
export type BodyScanConfirmResponseDto = z.infer<typeof bodyScanConfirmResponseDtoSchema>;
export type BodyScanReprocessResponseDto = z.infer<typeof bodyScanReprocessResponseDtoSchema>;
export type BodyScanDeleteResponseDto = z.infer<typeof bodyScanDeleteResponseDtoSchema>;
