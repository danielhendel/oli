/**
 * Finalize derived body truth after manual weight RawEvent delete.
 */
import { localCalendarDayKeyFromIsoInTimeZone, manualWeightPayloadSchema } from "@oli/contracts";

import { db, userCollection } from "../../db";
import { getRecomputeDerivedTruthForDay } from "../loadRecomputeDerivedTruthForDay";

const YMD_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function weightDayKeyFromManualPayload(payload: unknown): string | null {
  const parsed = manualWeightPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;

  const pl = parsed.data;
  if (typeof pl.day === "string" && YMD_DAY_KEY_RE.test(pl.day)) {
    return pl.day;
  }

  return localCalendarDayKeyFromIsoInTimeZone(pl.time, pl.timezone);
}

export async function deleteDerivedWeightForManualRawEvent(args: {
  userId: string;
  rawEventId: string;
}): Promise<{ canonicalDeleted: boolean }> {
  const ref = userCollection(args.userId, "events").doc(args.rawEventId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { canonicalDeleted: false };
  }

  const data = snap.data();
  if (data?.kind !== "weight") {
    return { canonicalDeleted: false };
  }

  await ref.delete();
  return { canonicalDeleted: true };
}

export async function finalizeManualWeightIngestDelete(args: {
  userId: string;
  rawEventId: string;
  payload: unknown;
}): Promise<{ dayKey: string; canonicalDeleted: boolean }> {
  const dayKey = weightDayKeyFromManualPayload(args.payload);
  if (dayKey === null) {
    throw new Error("WEIGHT_DAY_KEY_UNRESOLVED");
  }

  const { canonicalDeleted } = await deleteDerivedWeightForManualRawEvent({
    userId: args.userId,
    rawEventId: args.rawEventId,
  });

  await getRecomputeDerivedTruthForDay()({
    db,
    userId: args.userId,
    dayKey,
    trigger: { type: "realtime", eventId: args.rawEventId },
  });

  return { dayKey, canonicalDeleted };
}
