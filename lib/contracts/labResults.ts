// lib/contracts/labResults.ts
import { z } from "zod";

const isoDatetimeString = z.string().datetime();

export const biomarkerReadingDtoSchema = z
  .object({
    name: z.string().min(1),
    value: z.number().finite(),
    unit: z.string().min(1),
  })
  .strip();

export const labResultDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    userId: z.string().min(1),
    collectedAt: isoDatetimeString,
    sourceRawEventId: z.string().min(1).optional(),
    biomarkers: z.array(biomarkerReadingDtoSchema).min(1),
    createdAt: isoDatetimeString,
    updatedAt: isoDatetimeString,
  })
  .strip();

export const labResultsListResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    items: z.array(labResultDtoSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export const createLabResultRequestDtoSchema = z
  .object({
    collectedAt: isoDatetimeString,
    sourceRawEventId: z.string().min(1).optional(),
    biomarkers: z.array(biomarkerReadingDtoSchema).min(1),
  })
  .strip();

export const createLabResultResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    id: z.string().min(1),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export type BiomarkerReadingDto = z.infer<typeof biomarkerReadingDtoSchema>;
export type LabResultDto = z.infer<typeof labResultDtoSchema>;
export type LabResultsListResponseDto = z.infer<typeof labResultsListResponseDtoSchema>;
export type CreateLabResultRequestDto = z.infer<typeof createLabResultRequestDtoSchema>;
export type CreateLabResultResponseDto = z.infer<typeof createLabResultResponseDtoSchema>;
