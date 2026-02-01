// services/api/src/types/failureEntry.dto.ts

import { z } from "zod";

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Single failure list item as returned by the API.
 * Fail-closed: any unexpected shape should reject the response.
 */
export const failureListItemSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    code: z.string().min(1),
    message: z.string().min(1),
    day: ymdSchema,

    // ✅ Step 8 contract: ISO timestamp string in read surface
    createdAt: z.string().datetime(),

    timeZone: z.string().min(1).optional(),
    observedAt: z.string().datetime().optional(),

    rawEventId: z.string().min(1).optional(),
    rawEventPath: z.string().min(1).optional(),

    details: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

/**
 * List response with cursor pagination.
 */
export const failureListResponseSchema = z
  .object({
    items: z.array(failureListItemSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();

export type FailureListItemDto = z.infer<typeof failureListItemSchema>;
export type FailureListResponseDto = z.infer<typeof failureListResponseSchema>;
