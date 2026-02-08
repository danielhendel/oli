/**
 * Phase 1 Lock #6 — Canonical export job model.
 *
 * Export lifecycle: queued → running → succeeded | failed
 */
import { z } from "zod";

export const exportJobStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

export const exportRequestResponseDtoSchema = z.object({
  ok: z.literal(true),
  status: z.enum(["queued"]),
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
  status: exportJobStatusSchema,
  updatedAt: z.unknown().optional(),
  artifact: exportJobArtifactSchema.optional(),
  error: z.string().optional(),
  completedAt: z.unknown().optional(),
  startedAt: z.unknown().optional(),
});
export type ExportJobDoc = z.infer<typeof exportJobDocSchema>;

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
