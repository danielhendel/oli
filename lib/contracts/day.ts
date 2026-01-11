import { z } from "zod";

/**
 * Canonical day key: YYYY-MM-DD
 */
export const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid day format. Expected YYYY-MM-DD.");

export type DayKey = z.infer<typeof dayKeySchema>;

export const dayQuerySchema = z.object({
  day: dayKeySchema,
});

export type DayQuery = z.infer<typeof dayQuerySchema>;
