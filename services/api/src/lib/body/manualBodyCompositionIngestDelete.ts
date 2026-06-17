/**
 * Finalize derived body truth after body_composition RawEvent delete (Apple Health hide-from-Oli).
 */
import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";
import { z } from "zod";

import { db } from "../../db";
import { getRecomputeDerivedTruthForDay } from "../loadRecomputeDerivedTruthForDay";

const bodyCompositionPayloadSchema = z
  .object({
    time: z.string().min(1),
    timezone: z.string().min(1),
  })
  .strip();

export function bodyCompositionDayKeyFromPayload(payload: unknown): string | null {
  const parsed = bodyCompositionPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  return localCalendarDayKeyFromIsoInTimeZone(parsed.data.time, parsed.data.timezone);
}

export async function finalizeManualBodyCompositionIngestDelete(args: {
  userId: string;
  rawEventId: string;
  payload: unknown;
}): Promise<{ dayKey: string }> {
  const dayKey = bodyCompositionDayKeyFromPayload(args.payload);
  if (dayKey === null) {
    throw new Error("BODY_COMPOSITION_DAY_KEY_UNRESOLVED");
  }

  await getRecomputeDerivedTruthForDay()({
    db,
    userId: args.userId,
    dayKey,
    trigger: { type: "realtime", eventId: args.rawEventId },
  });

  return { dayKey };
}
