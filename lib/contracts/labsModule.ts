// lib/contracts/labsModule.ts
// Labs PDF upload + per-metric results (schema v2, additive to legacy labResults v0 panels).
import { z } from "zod";

const isoDatetimeString = z.string().datetime();

export const labUploadStatusSchema = z.enum([
  "uploaded",
  "processing",
  "needs_review",
  "parsed",
  "failed",
]);

export const labMetricFlagSchema = z.enum(["low", "normal", "high", "critical", "unknown"]);

export const labUploadDtoSchema = z
  .object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    storagePath: z.string().min(1),
    mimeType: z.string().min(1),
    uploadedAt: isoDatetimeString,
    labDate: isoDatetimeString.optional(),
    reportSource: z.string().min(1).optional(),
    status: labUploadStatusSchema,
    extractedCount: z.number().int().nonnegative(),
    matchedCount: z.number().int().nonnegative(),
    unmatchedCount: z.number().int().nonnegative(),
    errorMessage: z.string().min(1).optional(),
  })
  .strip();

export const labMetricResultDtoSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string().min(1),
    uploadId: z.string().min(1),
    metricKey: z.string().min(1),
    displayName: z.string().min(1),
    categoryKey: z.string().min(1),
    value: z.number().finite().nullable(),
    unit: z.string().min(1).nullable(),
    referenceRangeLow: z.number().finite().nullable().optional(),
    referenceRangeHigh: z.number().finite().nullable().optional(),
    referenceRangeText: z.string().min(1).nullable().optional(),
    flag: labMetricFlagSchema.nullable().optional(),
    collectedAt: isoDatetimeString.nullable().optional(),
    reportedAt: isoDatetimeString.nullable().optional(),
    source: z.literal("lab_pdf"),
    confidence: z.number().min(0).max(1),
    rawName: z.string().min(1),
    rawUnit: z.string().nullable().optional(),
    rawValueText: z.string().nullable().optional(),
    createdAt: isoDatetimeString,
  })
  .strip();

export const labsSummaryResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    categories: z.array(
      z
        .object({
          categoryKey: z.string().min(1),
          displayName: z.string().min(1),
          metrics: z.array(
            z
              .object({
                metricKey: z.string().min(1),
                displayName: z.string().min(1),
                latestValueText: z.string().min(1),
                flag: labMetricFlagSchema.nullable().optional(),
                collectedAt: isoDatetimeString.nullable().optional(),
                uploadId: z.string().min(1).nullable().optional(),
              })
              .strip(),
          ),
        })
        .strip(),
    ),
    uploadCount: z.number().int().nonnegative(),
  })
  .strip();

export const labUploadsListResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    items: z.array(labUploadDtoSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export const createLabUploadRequestDtoSchema = z
  .object({
    fileName: z.string().min(1),
    mimeType: z.literal("application/pdf"),
    fileBase64: z.string().min(1),
    labDate: isoDatetimeString.optional(),
    reportSource: z.string().min(1).optional(),
  })
  .strip();

export const createLabUploadResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    id: z.string().min(1),
    status: labUploadStatusSchema,
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export const labUploadDetailResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    upload: labUploadDtoSchema,
    resultsByCategory: z.array(
      z
        .object({
          categoryKey: z.string().min(1),
          displayName: z.string().min(1),
          results: z.array(labMetricResultDtoSchema),
        })
        .strip(),
    ),
    unmatchedResults: z.array(labMetricResultDtoSchema),
    pdfUrl: z.string().url().nullable().optional(),
  })
  .strip();

export const labMetricDetailResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    metricKey: z.string().min(1),
    displayName: z.string().min(1),
    categoryKey: z.string().min(1),
    preferredUnit: z.string().min(1),
    latest: labMetricResultDtoSchema.nullable(),
    history: z.array(labMetricResultDtoSchema),
    referenceRangeText: z.string().nullable().optional(),
  })
  .strip();

export type LabUploadStatus = z.infer<typeof labUploadStatusSchema>;
export type LabMetricFlag = z.infer<typeof labMetricFlagSchema>;
export type LabUploadDto = z.infer<typeof labUploadDtoSchema>;
export type LabMetricResultDto = z.infer<typeof labMetricResultDtoSchema>;
export type LabsSummaryResponseDto = z.infer<typeof labsSummaryResponseDtoSchema>;
export type LabUploadsListResponseDto = z.infer<typeof labUploadsListResponseDtoSchema>;
export type CreateLabUploadRequestDto = z.infer<typeof createLabUploadRequestDtoSchema>;
export type CreateLabUploadResponseDto = z.infer<typeof createLabUploadResponseDtoSchema>;
export type LabUploadDetailResponseDto = z.infer<typeof labUploadDetailResponseDtoSchema>;
export type LabMetricDetailResponseDto = z.infer<typeof labMetricDetailResponseDtoSchema>;
