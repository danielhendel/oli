import { z } from "zod";

export const eventSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1),
  // accept ISO string or epoch ms — adjust if you only want one form
  timestamp: z.union([z.string().datetime(), z.number().int()]),
  data: z.unknown().optional(),
});

export type EventPayload = z.infer<typeof eventSchema>;
