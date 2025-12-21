// services/api/src/types/day.ts
import { z } from "zod";

/**
 * Canonical day key format used throughout Oli.
 * Example: "2025-12-21"
 */
export const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid day format. Expected YYYY-MM-DD.");

export type DayKey = z.infer<typeof dayKeySchema>;

/**
 * Standard query: ?day=YYYY-MM-DD
 */
export const dayQuerySchema = z.object({
  day: dayKeySchema,
});

export type DayQuery = z.infer<typeof dayQuerySchema>;
