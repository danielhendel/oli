// services/api/src/types/events.ts
import { z } from "zod";

// Keep in sync with services/functions/src/types/health.ts
export const rawEventKindSchema = z.enum(["sleep", "steps", "workout", "weight", "hrv"]);
export const rawEventProviderSchema = z.enum(["manual"]);

// ISO datetime validator (must be parseable)
const isoDateTimeString = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime string" });

/**
 * RawEvent ingestion request body for Cloud Run gateway.
 *
 * Compatibility:
 * - Accepts either `observedAt` (preferred) or legacy `occurredAt`.
 * - Writes canonical RawEvent envelope to Firestore.
 */
export const ingestRawEventSchema = z
  .object({
    provider: rawEventProviderSchema.default("manual"),
    kind: rawEventKindSchema,

    // Preferred
    observedAt: isoDateTimeString.optional(),
    // Legacy (accepted for backward compatibility)
    occurredAt: isoDateTimeString.optional(),

    sourceId: z.string().min(1).optional().default("manual"),

    // Payload is deliberately opaque at ingestion boundary
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
