// services/api/src/types/rawEventListItem.dto.ts

import { z } from "zod";

/**
 * RawEventListItem DTO (Phase 1 — Step 3)
 *
 * Summary-only view for the Personal Health Library (RawEvent memory index).
 * This DTO is intentionally payload-free to prevent client corruption and leakage.
 */

const isoDateTimeString = z.string().datetime();

export const uploadSummaryDtoSchema = z
  .object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    sha256: z.string().min(1),
    storagePath: z.string().min(1),
  })
  .strict();

export const rawEventListItemDtoSchema = z
  .object({
    id: z.string().min(1),

    kind: z.string().min(1),
    provider: z.string().min(1),
    sourceId: z.string().min(1),
    sourceType: z.string().min(1),

    observedAt: isoDateTimeString,
    receivedAt: isoDateTimeString,
    timeZone: z.string().min(1).optional(),

    // Only present for upload-backed raw events (kind === "file").
    upload: uploadSummaryDtoSchema.optional(),
  })
  .strict();

export type RawEventListItemDto = z.infer<typeof rawEventListItemDtoSchema>;

export const rawEventsListResponseDtoSchema = z
  .object({
    items: z.array(rawEventListItemDtoSchema),
    nextCursor: z.string().min(1).nullable(),
  })
  .strict();

export type RawEventsListResponseDto = z.infer<typeof rawEventsListResponseDtoSchema>;