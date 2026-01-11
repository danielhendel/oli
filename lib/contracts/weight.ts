import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

// Raw manual payload written into RawEvent payload.
// NOTE: Server remains authoritative for day (it will compute/override).
export const manualWeightPayloadSchema = z
  .object({
    time: isoString,
    timezone: z.string().min(1),

    // Back-compat: some deployed APIs may still require day.
    // We include it when present, but server should compute it itself.
    day: dayKeySchema.optional(),

    weightKg: z.number().finite().positive(),
    bodyFatPercent: z.number().finite().min(0).max(100).nullable().optional(),
  })
  .strip();

export type ManualWeightPayload = z.infer<typeof manualWeightPayloadSchema>;

// DTOs for POST /users/me/body/weight
export const logWeightRequestDtoSchema = manualWeightPayloadSchema;
export type LogWeightRequestDto = z.infer<typeof logWeightRequestDtoSchema>;

export const logWeightResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    rawEventId: z.string().min(1),
    day: dayKeySchema,
  })
  .strip();

export type LogWeightResponseDto = z.infer<typeof logWeightResponseDtoSchema>;
