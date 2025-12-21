// services/api/src/types/events.ts
import { z } from "zod";

export const rawEventKindSchema = z.enum(["sleep", "steps", "workout", "weight", "hrv"]);
export const rawEventProviderSchema = z.enum(["manual"]);

/**
 * RawEvent ingestion request body for Cloud Run gateway.
 *
 * NOTE: Step 2 supports provider=manual and the manual kinds
 * your Functions normalization supports today.
 */
export const ingestRawEventSchema = z.object({
  provider: rawEventProviderSchema.default("manual"),
  kind: rawEventKindSchema,
  occurredAt: z.string().min(1), // ISO string recommended (e.g., new Date().toISOString())
  sourceId: z.string().min(1).optional().default("manual"),
  payload: z.record(z.string(), z.unknown()),
});

export type IngestRawEventBody = z.infer<typeof ingestRawEventSchema>;
