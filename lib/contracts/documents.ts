/**
 * Document Ingestion OS contracts (Phase 3C).
 *
 * Additive, domain-agnostic. Does not replace labsModule DTOs.
 * Consumer/safe DTOs intentionally omit storage paths, UIDs, checksums,
 * signed URLs, and parser internals.
 */
import { z } from "zod";

const isoDatetimeString = z.string().datetime();

export const DOCUMENT_SCHEMA_VERSION = "1.0.0" as const;

export const documentDomainSchema = z.enum([
  "labs",
  "scans",
  "dna",
  "medical_history",
  "medications",
  "supplements",
  "other_health_record",
]);

export const documentTypeSchema = z.enum([
  "lab_report",
  "dexa_report",
  "imaging_report",
  "dna_report",
  "medical_record",
  "medication_record",
  "supplement_record",
  "unknown",
]);

export const documentRecordStatusSchema = z.enum([
  "uploading",
  "stored",
  "processing",
  "review_needed",
  "structured",
  "unsupported",
  "failed",
]);

export const documentIngestionJobStateSchema = z.enum([
  "created",
  "validating",
  "validation_failed",
  "storing",
  "stored",
  "classifying",
  "extraction_queued",
  "extracting",
  "extraction_failed",
  "extraction_unsupported",
  "extracted",
  "validation_pending",
  "validation_failed",
  "review_needed",
  "accepted",
  "completed",
  "cancelled",
]);

export const documentExtractionStatusSchema = z.enum([
  "unsupported",
  "failed",
  "partial",
  "complete",
]);

export const documentReviewStatusSchema = z.enum([
  "extracted",
  "review_needed",
  "accepted",
  "rejected",
]);

export const documentMediaTypeSchema = z.enum([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
]);

export const documentSourceSchema = z.literal("user_upload");

/** Internal durable document metadata (server / retention). Not a consumer DTO. */
export const userDocumentRecordSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
    id: z.string().min(1),
    userId: z.string().min(1),
    domain: documentDomainSchema,
    documentType: documentTypeSchema,
    originalFilename: z.string().min(1).max(255),
    safeDisplayFilename: z.string().min(1).max(255),
    mediaType: documentMediaTypeSchema,
    byteSize: z.number().int().positive(),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    storageObjectId: z.string().min(1),
    uploadedAt: isoDatetimeString,
    source: documentSourceSchema,
    status: documentRecordStatusSchema,
    parser: z
      .object({
        id: z.string().min(1),
        version: z.string().min(1),
      })
      .optional(),
    retentionStatus: z.enum(["active", "pending_delete", "deleted"]),
    legacyLabUploadId: z.string().min(1).optional(),
    createdAt: isoDatetimeString,
    updatedAt: isoDatetimeString,
  })
  .strip();

export const documentIngestionJobSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
    id: z.string().min(1),
    documentId: z.string().min(1),
    userId: z.string().min(1),
    state: documentIngestionJobStateSchema,
    domain: documentDomainSchema,
    documentType: documentTypeSchema,
    parserId: z.string().min(1).optional(),
    parserVersion: z.string().min(1).optional(),
    extractionVersion: z.string().min(1).optional(),
    dryRun: z.boolean(),
    reprocessOfJobId: z.string().min(1).optional(),
    errorCode: z.string().min(1).optional(),
    warningCodes: z.array(z.string().min(1)),
    createdAt: isoDatetimeString,
    updatedAt: isoDatetimeString,
    stateHistory: z.array(
      z
        .object({
          state: documentIngestionJobStateSchema,
          at: isoDatetimeString,
        })
        .strip(),
    ),
  })
  .strip();

export const documentClassificationResultSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
    documentType: documentTypeSchema,
    confidence: z.number().min(0).max(1).nullable(),
    reasonCode: z.string().min(1),
    requiresReview: z.boolean(),
    classifierVersion: z.string().min(1),
  })
  .strip();

export const extractedDocumentFieldSchema = z
  .object({
    fieldId: z.string().min(1),
    rawLabel: z.string().min(1).max(500),
    rawValue: z.string().min(1).max(2000),
    normalizedCandidateValue: z.union([z.string(), z.number().finite()]).nullable().optional(),
    unitCandidate: z.string().max(64).nullable().optional(),
    pageNumber: z.number().int().positive(),
    sourceLocator: z.string().max(500).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable(),
    warningCodes: z.array(z.string().min(1)),
    parserFieldType: z.string().min(1),
    requiresReview: z.boolean(),
  })
  .strip();

export const extractionWarningSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1).max(500),
    fieldId: z.string().min(1).optional(),
  })
  .strip();

export const extractionProvenanceSchema = z
  .object({
    documentId: z.string().min(1),
    fieldId: z.string().min(1),
    parserId: z.string().min(1),
    parserVersion: z.string().min(1),
    extractionVersion: z.string().min(1),
    pageNumber: z.number().int().positive(),
    sourceLocator: z.string().max(500).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable(),
    warningCodes: z.array(z.string().min(1)),
    computedAt: isoDatetimeString,
  })
  .strip();

export const documentExtractionResultSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
    documentId: z.string().min(1),
    parserId: z.string().min(1),
    parserVersion: z.string().min(1),
    extractionVersion: z.string().min(1),
    status: documentExtractionStatusSchema,
    pagesProcessed: z.number().int().nonnegative(),
    pageCount: z.number().int().positive().optional(),
    fields: z.array(extractedDocumentFieldSchema),
    warnings: z.array(extractionWarningSchema),
    confidenceSummary: z
      .object({
        overall: z.number().min(0).max(1).nullable(),
        lowConfidenceFieldCount: z.number().int().nonnegative(),
      })
      .strip(),
    provenance: z.array(extractionProvenanceSchema),
    sourceDocumentChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    reviewStatus: documentReviewStatusSchema,
    createdAt: isoDatetimeString,
  })
  .strip();

/** Safe list/detail item — no storage path, uid, checksum, MIME raw, parser IDs. */
export const documentListItemDtoSchema = z
  .object({
    id: z.string().min(1),
    filename: z.string().min(1),
    domain: documentDomainSchema,
    documentType: documentTypeSchema,
    uploadedAt: isoDatetimeString,
    status: documentRecordStatusSchema,
    canViewOriginal: z.boolean(),
    canRetry: z.boolean(),
    canDelete: z.boolean(),
    legacySource: z.enum(["document", "lab_upload"]),
  })
  .strip();

export const documentsListResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    items: z.array(documentListItemDtoSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export const documentDetailDtoSchema = z
  .object({
    id: z.string().min(1),
    filename: z.string().min(1),
    domain: documentDomainSchema,
    documentType: documentTypeSchema,
    uploadedAt: isoDatetimeString,
    status: documentRecordStatusSchema,
    processingState: documentIngestionJobStateSchema.nullable(),
    extractionAvailability: z.enum(["unavailable", "pending", "review_needed", "available"]),
    safeWarnings: z.array(z.string().min(1)),
    canViewOriginal: z.boolean(),
    canRetry: z.boolean(),
    canDelete: z.boolean(),
    legacySource: z.enum(["document", "lab_upload"]),
    /** Labs auto-publish import summary (optional; present after Phase 3D-A extraction). */
    importedCount: z.number().int().nonnegative().optional(),
    reviewNeededCount: z.number().int().nonnegative().optional(),
    unmatchedCount: z.number().int().nonnegative().optional(),
    reportImportStatus: z
      .enum([
        "imported",
        "imported_review_recommended",
        "review_needed",
        "unsupported",
        "failed",
        "structured",
      ])
      .optional(),
    hasAutoPublishedResults: z.boolean().optional(),
    hasReviewItems: z.boolean().optional(),
  })
  .strip();

export const documentDetailResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    document: documentDetailDtoSchema,
  })
  .strip();

export const documentUploadIntentRequestDtoSchema = z
  .object({
    domain: documentDomainSchema,
    documentType: documentTypeSchema.optional(),
    originalFilename: z.string().min(1).max(255),
    mediaType: documentMediaTypeSchema,
    byteSize: z.number().int().positive(),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .strip();

export const documentUploadIntentResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    documentId: z.string().min(1),
    status: z.literal("uploading"),
    maxByteSize: z.number().int().positive(),
    allowedMediaTypes: z.array(documentMediaTypeSchema),
  })
  .strip();

export const documentCompleteUploadRequestDtoSchema = z
  .object({
    fileBase64: z.string().min(1),
    originalFilename: z.string().min(1).max(255),
    mediaType: documentMediaTypeSchema,
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .strip();

export const documentCompleteUploadResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    documentId: z.string().min(1),
    status: documentRecordStatusSchema,
    duplicate: z.boolean().optional(),
    /** True when an existing unsupported/failed original may be reprocessed. */
    reprocessAvailable: z.boolean().optional(),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export const documentReprocessRequestDtoSchema = z
  .object({
    dryRun: z.boolean().optional(),
    parserId: z.string().min(1).optional(),
  })
  .strip();

export const documentReprocessResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    documentId: z.string().min(1),
    jobId: z.string().min(1),
    status: documentRecordStatusSchema,
    dryRun: z.boolean(),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export const documentDeleteResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    documentId: z.string().min(1),
    deleted: z.literal(true),
  })
  .strip();

export const documentViewOriginalResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    available: z.literal(false),
    reasonCode: z.literal("VIEW_ORIGINAL_NOT_IMPLEMENTED"),
  })
  .strip();

export type DocumentDomain = z.infer<typeof documentDomainSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentRecordStatus = z.infer<typeof documentRecordStatusSchema>;
export type DocumentIngestionJobState = z.infer<typeof documentIngestionJobStateSchema>;
export type DocumentExtractionStatus = z.infer<typeof documentExtractionStatusSchema>;
export type DocumentReviewStatus = z.infer<typeof documentReviewStatusSchema>;
export type DocumentMediaType = z.infer<typeof documentMediaTypeSchema>;
export type UserDocumentRecord = z.infer<typeof userDocumentRecordSchema>;
export type DocumentIngestionJob = z.infer<typeof documentIngestionJobSchema>;
export type DocumentClassificationResult = z.infer<typeof documentClassificationResultSchema>;
export type ExtractedDocumentField = z.infer<typeof extractedDocumentFieldSchema>;
export type ExtractionWarning = z.infer<typeof extractionWarningSchema>;
export type ExtractionProvenance = z.infer<typeof extractionProvenanceSchema>;
export type DocumentExtractionResult = z.infer<typeof documentExtractionResultSchema>;
export type DocumentListItemDto = z.infer<typeof documentListItemDtoSchema>;
export type DocumentsListResponseDto = z.infer<typeof documentsListResponseDtoSchema>;
export type DocumentDetailDto = z.infer<typeof documentDetailDtoSchema>;
export type DocumentDetailResponseDto = z.infer<typeof documentDetailResponseDtoSchema>;
export type DocumentUploadIntentRequestDto = z.infer<typeof documentUploadIntentRequestDtoSchema>;
export type DocumentUploadIntentResponseDto = z.infer<typeof documentUploadIntentResponseDtoSchema>;
export type DocumentCompleteUploadRequestDto = z.infer<typeof documentCompleteUploadRequestDtoSchema>;
export type DocumentCompleteUploadResponseDto = z.infer<typeof documentCompleteUploadResponseDtoSchema>;
export type DocumentReprocessRequestDto = z.infer<typeof documentReprocessRequestDtoSchema>;
export type DocumentReprocessResponseDto = z.infer<typeof documentReprocessResponseDtoSchema>;
export type DocumentDeleteResponseDto = z.infer<typeof documentDeleteResponseDtoSchema>;
export type DocumentViewOriginalResponseDto = z.infer<typeof documentViewOriginalResponseDtoSchema>;
