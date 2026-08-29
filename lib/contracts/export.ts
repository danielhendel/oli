/**
 * Phase 1 Lock #6 — Canonical export job model.
 *
 * Export lifecycle: queued → running → succeeded | failed
 * Production executor also uses: queued → in_progress → completed | failed
 */
import { z } from "zod";

export const exportJobStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

/** Backend status values observed in production and test executors. */
export const exportBackendStatusSchema = z.enum([
  "queued",
  "in_progress",
  "running",
  "completed",
  "succeeded",
  "failed",
]);
export type ExportBackendStatus = z.infer<typeof exportBackendStatusSchema>;

/** Consumer-facing export state (mobile/domain). */
export const consumerExportStatusSchema = z.enum([
  "idle",
  "requesting",
  "pending",
  "ready",
  "failed",
  "expired",
]);
export type ConsumerExportStatus = z.infer<typeof consumerExportStatusSchema>;

export const exportRequestResponseDtoSchema = z.object({
  ok: z.literal(true),
  status: exportBackendStatusSchema,
  requestId: z.string().min(1),
});
export type ExportRequestResponseDto = z.infer<typeof exportRequestResponseDtoSchema>;

export const exportJobArtifactSchema = z.object({
  artifactId: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().nullable(),
  schemaVersion: z.number().int().positive().optional(),
});
export type ExportJobArtifact = z.infer<typeof exportJobArtifactSchema>;

export const exportJobDocSchema = z.object({
  uid: z.string().min(1),
  requestId: z.string().min(1),
  requestedAt: z.string().nullable(),
  status: exportBackendStatusSchema,
  updatedAt: z.unknown().optional(),
  artifact: exportJobArtifactSchema.optional(),
  error: z.string().optional(),
  completedAt: z.unknown().optional(),
  startedAt: z.unknown().optional(),
  packageAvailable: z.boolean().optional(),
  packageKind: z.string().optional(),
});
export type ExportJobDoc = z.infer<typeof exportJobDocSchema>;

export const exportStatusResponseDtoSchema = z.object({
  ok: z.literal(true),
  requestId: z.string().min(1),
  status: consumerExportStatusSchema,
  backendStatus: exportBackendStatusSchema,
  requestedAt: z.string().nullable(),
  updatedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  packageAvailable: z.boolean(),
  retryable: z.boolean(),
  failureCategory: z
    .enum([
      "none",
      "processing_failed",
      "artifact_unavailable",
      "expired",
      "stale_pending",
      "unknown",
    ])
    .optional(),
});
export type ExportStatusResponseDto = z.infer<typeof exportStatusResponseDtoSchema>;

export const exportLatestResponseDtoSchema = z.union([
  z.object({ ok: z.literal(true), export: z.null() }),
  z.object({ ok: z.literal(true), export: exportStatusResponseDtoSchema.omit({ ok: true }) }),
]);
export type ExportLatestResponseDto = z.infer<typeof exportLatestResponseDtoSchema>;

export const exportDownloadResponseDtoSchema = z.object({
  ok: z.literal(true),
  contentType: z.string().min(1),
  expiresAt: z.string(),
  downloadUrl: z.string().url(),
});
export type ExportDownloadResponseDto = z.infer<typeof exportDownloadResponseDtoSchema>;

export const exportArtifactPayloadSchema = z.object({
  schemaVersion: z.number().int().positive(),
  kind: z.string().min(1),
  uid: z.string().min(1),
  requestId: z.string().min(1),
  requestedAt: z.string().nullable(),
  generatedAt: z.string(),
  data: z.object({
    profile: z.unknown().optional(),
    collections: z.record(z.array(z.record(z.unknown()))),
  }),
});
export type ExportArtifactPayload = z.infer<typeof exportArtifactPayloadSchema>;

/** Package retention after completion (matches API default). */
export const EXPORT_PACKAGE_RETENTION_DAYS = 7;

/**
 * Maximum age for queued (never started) before API treats the request as
 * failed (stale). Ready artifacts retain separately for EXPORT_PACKAGE_RETENTION_DAYS.
 */
export const EXPORT_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Once processing has started (`startedAt`), the Function timeout is short
 * (staging ~60s). Pending beyond this after start means the worker died
 * without a terminal write (e.g. OOM) and must not look “in progress” forever.
 */
export const EXPORT_PENDING_STARTED_MAX_AGE_MS = 10 * 60 * 1000;

/** Short-lived signed download URL TTL (seconds). */
export const EXPORT_DOWNLOAD_URL_TTL_SECONDS = 15 * 60;
