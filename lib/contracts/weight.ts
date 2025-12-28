import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

export const manualWeightPayloadSchema = z
  .object({
    time: isoString,
    day: dayKeySchema,
    timezone: z.string().min(1),
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
