// lib/contracts/dayTruth.ts
import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

export const dayTruthDtoSchema = z
  .object({
    day: dayKeySchema,
    eventsCount: z.number().int().nonnegative(),
    latestCanonicalEventAt: isoString.nullable(),
  })
  .strip();

export type DayTruthDto = z.infer<typeof dayTruthDtoSchema>;
