// services/api/src/types/events.ts
import { z } from "zod";

/**
 * ============================================================================
 * Phase 1 — Ingestion Contract (AUTHORITATIVE)
 * ============================================================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for what the Cloud Run ingestion
 * gateway ACCEPTS.
 *
 * If a kind / provider / field is NOT defined here:
 *   → it MUST NOT be accepted at the ingestion boundary.
 *
 * IMPORTANT:
 * - Downstream systems (functions, derived pipelines, clients) may support
 *   additional kinds, but they do NOT become ingestible until added HERE.
 * - This prevents silent drift and preserves Phase 1 trust guarantees.
 *
 * Do NOT “keep in sync” manually — change THIS file first.
 */

/**
 * Supported RawEvent kinds accepted by the ingestion gateway TODAY.
 *
 * Adding a new kind here is a Phase 1–critical change and must be deliberate.
 */
export const rawEventKindSchema = z.enum([
  "sleep",
  "steps",
  "workout",
  "weight",
  "hrv",
]);

export type RawEventKind = z.infer<typeof rawEventKindSchema>;

/**
 * Supported providers at the ingestion boundary.
 * Phase 1 accepts only manual ingestion.
 */
export const rawEventProviderSchema = z.enum(["manual"]);
export type RawEventProvider = z.infer<typeof rawEventProviderSchema>;

/**
 * ISO datetime validator (must be parseable by Date.parse).
 * Used for all ingestion time semantics.
 */
const isoDateTimeString = z
  .string()
  .min(1)
  .refine(
    (v) => !Number.isNaN(Date.parse(v)),
    { message: "Invalid ISO datetime string" }
  );

/**
 * RawEvent ingestion request body for the Cloud Run gateway.
 *
 * Time semantics:
 * - `observedAt` is preferred and canonical.
 * - `occurredAt` is accepted for backward compatibility.
 * - Exactly one of them MUST be present.
 *
 * Payload semantics:
 * - Payload is intentionally opaque at the ingestion boundary.
 * - Payload validation occurs downstream (normalization phase).
 */
export const ingestRawEventSchema = z
  .object({
    provider: rawEventProviderSchema.default("manual"),
    kind: rawEventKindSchema,

    // Preferred canonical time
    observedAt: isoDateTimeString.optional(),

    // Legacy compatibility
    occurredAt: isoDateTimeString.optional(),

    // Optional source identifier (defaults to manual)
    sourceId: z.string().min(1).optional().default("manual"),

    // Deliberately opaque at ingestion boundary
    payload: z.unknown(),
  })
  .superRefine((val, ctx) => {
    if (!val.observedAt && !val.occurredAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either observedAt or occurredAt is required",
        path: ["observedAt"],
      });
    }
  });

export type IngestRawEventBody = z.infer<typeof ingestRawEventSchema>;
