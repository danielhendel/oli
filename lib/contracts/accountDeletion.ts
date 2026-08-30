/**
 * Account deletion lifecycle contracts (Stage 1C).
 */
import { z } from "zod";

/** Backend worker/API status values. */
export const deleteBackendStatusSchema = z.enum([
  "queued",
  "in_progress",
  "completed",
  "failed",
]);
export type DeleteBackendStatus = z.infer<typeof deleteBackendStatusSchema>;

/** Consumer-facing deletion state (mobile). */
export const consumerDeleteStatusSchema = z.enum([
  "idle",
  "reauthenticating",
  "requesting",
  "queued",
  "processing",
  "accepted",
  "failed",
  "cleanup_required",
  "locally_completed",
]);
export type ConsumerDeleteStatus = z.infer<typeof consumerDeleteStatusSchema>;

export const deleteRequestResponseDtoSchema = z.object({
  ok: z.literal(true),
  status: deleteBackendStatusSchema,
  requestId: z.string().min(1),
});
export type DeleteRequestResponseDto = z.infer<typeof deleteRequestResponseDtoSchema>;

export const deleteStatusResponseDtoSchema = z.object({
  ok: z.literal(true),
  requestId: z.string().min(1),
  status: consumerDeleteStatusSchema,
  backendStatus: deleteBackendStatusSchema,
  requestedAt: z.string().nullable(),
  updatedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  retryable: z.boolean(),
  failureCategory: z
    .enum([
      "none",
      "processing_failed",
      "stale_pending",
      "local_cleanup_failed",
      "unknown",
    ])
    .optional(),
});
export type DeleteStatusResponseDto = z.infer<typeof deleteStatusResponseDtoSchema>;

export const deleteLatestResponseDtoSchema = z.union([
  z.object({ ok: z.literal(true), deletion: z.null() }),
  z.object({ ok: z.literal(true), deletion: deleteStatusResponseDtoSchema.omit({ ok: true }) }),
]);
export type DeleteLatestResponseDto = z.infer<typeof deleteLatestResponseDtoSchema>;

/** Maximum age for queued deletion before API treats as stale failed. */
export const DELETE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Once processing started, worker timeout window before stale. */
export const DELETE_PENDING_STARTED_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Server-enforced recent-authentication window for POST /account/delete.
 * Bound is verified Firebase ID token `auth_time` vs server now (ADR v1).
 */
export const DELETE_RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;
