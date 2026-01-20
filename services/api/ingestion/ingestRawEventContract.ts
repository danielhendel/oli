// services/api/src/ingestion/ingestRawEventContract.ts
import { z } from "zod";

/**
 * Phase 1 — Ingestion Contract (Cloud Run Gateway)
 *
 * Authoritative contract for POST /ingest.
 *
 * IMPORTANT:
 * - This reflects what the gateway ACCEPTS TODAY (no guessing / no expansion).
 * - If/when you add nutrition/uploads/backfill, expand this contract explicitly.
 */

// ISO datetime validator (must be parseable)
export const isoDateTimeStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime string" });

/**
 * Supported kinds at the ingestion gateway boundary.
 * NOTE: Functions/types and client/contracts may contain additional kinds (e.g., nutrition),
 * but the gateway does NOT accept them today.
 */
export const ingestRawEventKindSchema = z.enum(["sleep", "steps", "workout", "weight", "hrv"]);

/**
 * Supported providers at the gateway boundary.
 * The gateway sets sourceType="manual" today and defaults provider="manual".
 */
export const ingestRawEventProviderSchema = z.enum(["manual"]);

export const ingestRawEventBodySchema = z
  .object({
    provider: ingestRawEventProviderSchema.default("manual"),
    kind: ingestRawEventKindSchema,

    // Preferred
    observedAt: isoDateTimeStringSchema.optional(),
    // Legacy (accepted for backward compatibility)
    occurredAt: isoDateTimeStringSchema.optional(),

    sourceId: z.string().min(1).optional().default("manual"),

    // Payload is opaque at the request boundary; downstream contract validates it
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

export type IngestRawEventBody = z.infer<typeof ingestRawEventBodySchema>;

/**
 * Header contract: requires Idempotency-Key (or X-Idempotency-Key).
 */
export function requireIdempotencyKey(
  header: (name: string) => string | undefined
): { ok: true; key: string } | { ok: false; error: { code: "MISSING_IDEMPOTENCY_KEY"; message: string } } {
  const key =
    (typeof header("Idempotency-Key") === "string" ? header("Idempotency-Key") : undefined) ??
    (typeof header("X-Idempotency-Key") === "string" ? header("X-Idempotency-Key") : undefined);

  if (!key) {
    return {
      ok: false,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY",
        message: "Idempotency-Key header is required for ingestion",
      },
    };
  }
  return { ok: true, key };
}
