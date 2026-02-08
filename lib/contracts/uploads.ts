// lib/contracts/uploads.ts
/**
 * Uploads presence (read-only UI surface).
 * GET /users/me/uploads
 */
import { z } from "zod";

const isoString = z.string().min(1);

export const uploadsPresenceLatestDtoSchema = z
  .object({
    rawEventId: z.string().min(1),
    observedAt: isoString,
    receivedAt: isoString,
    originalFilename: z.string().min(1).optional(),
    mimeType: z.string().min(1).optional(),
  })
  .strip();

export const uploadsPresenceResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    count: z.number().int().nonnegative(),
    latest: uploadsPresenceLatestDtoSchema.nullable(),
  })
  .strip();

export type UploadsPresenceLatestDto = z.infer<typeof uploadsPresenceLatestDtoSchema>;
export type UploadsPresenceResponseDto = z.infer<typeof uploadsPresenceResponseDtoSchema>;
