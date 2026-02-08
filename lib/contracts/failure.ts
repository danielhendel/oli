// lib/contracts/failure.ts

/**
 * Failure Memory DTOs (read-only UI surface).
 *
 * Source of truth: API runtime DTO validation (services/api).
 * Client must not invent semantics beyond these fields.
 */

import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

export const failureDetailsDtoSchema = z.record(z.string(), z.unknown()).nullable();
export type FailureDetailsDto = z.infer<typeof failureDetailsDtoSchema>;

export const failureListItemDtoSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    code: z.string().min(1),
    message: z.string().min(1),
    day: dayKeySchema,
    createdAt: isoString,
    timeZone: z.string().min(1).optional(),
    observedAt: isoString.optional(),
    rawEventId: z.string().min(1).optional(),
    rawEventPath: z.string().min(1).optional(),
    details: failureDetailsDtoSchema.optional(),
  })
  .strip();

export type FailureListItemDto = z.infer<typeof failureListItemDtoSchema>;

export const failureListResponseDtoSchema = z
  .object({
    items: z.array(failureListItemDtoSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export type FailureListResponseDto = z.infer<typeof failureListResponseDtoSchema>;
