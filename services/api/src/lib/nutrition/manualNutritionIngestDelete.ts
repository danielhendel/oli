/**
 * Cleans up derived nutrition truth after a manual nutrition RawEvent is removed via DELETE /ingest/:id.
 * Manual nutrition canonical events share the same document id as their source raw event.
 */

import { localCalendarDayKeyFromIsoInTimeZone, manualNutritionPayloadSchema } from "@oli/contracts";

import { db, userCollection } from "../../db";
import { getRecomputeDerivedTruthForDay } from "../loadRecomputeDerivedTruthForDay";

const YMD_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function nutritionDayKeyFromManualPayload(payload: unknown): string | null {
  const parsed = manualNutritionPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;

  const pl = parsed.data;
  if (typeof pl.day === "string" && YMD_DAY_KEY_RE.test(pl.day)) {
    return pl.day;
  }

  return localCalendarDayKeyFromIsoInTimeZone(pl.start, pl.timezone);
}

export async function deleteDerivedNutritionForManualRawEvent(args: {
  userId: string;
  rawEventId: string;
}): Promise<{ canonicalDeleted: boolean }> {
  const ref = userCollection(args.userId, "events").doc(args.rawEventId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { canonicalDeleted: false };
  }

  const data = snap.data();
  if (data?.kind !== "nutrition") {
    return { canonicalDeleted: false };
  }

  await ref.delete();
  return { canonicalDeleted: true };
}

export async function finalizeManualNutritionIngestDelete(args: {
  userId: string;
  rawEventId: string;
  payload: unknown;
}): Promise<{ dayKey: string; canonicalDeleted: boolean }> {
  const dayKey = nutritionDayKeyFromManualPayload(args.payload);
  if (dayKey === null) {
    throw new Error("NUTRITION_DAY_KEY_UNRESOLVED");
  }

  const { canonicalDeleted } = await deleteDerivedNutritionForManualRawEvent({
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
