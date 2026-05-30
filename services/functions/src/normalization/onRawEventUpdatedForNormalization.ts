// services/functions/src/normalization/onRawEventUpdatedForNormalization.ts

/**
 * Re-runs raw → canonical normalization when a steps, sleep, or workout rawEvent
 * document is updated.
 *
 * Ingest uses deterministic raw doc ids (Idempotency-Key). After the first create,
 * replays return 202 without a second `onCreate`. If normalization failed under an
 * older mapper (e.g. apple_health steps), a subsequent replay must still be able to
 * produce canonical events. The API bumps `receivedAt` on steps replays; this
 * trigger picks up those writes.
 *
 * Sleep: payload may gain rem/deep stage minutes after mapper/ingest upgrades; operators patch
 * raw docs with a newer `receivedAt` so canonical + DailyFacts can be refreshed.
 *
 * Workout (Workout Physiology v1 — Phase B): when an Apple Health workout is replayed
 * with newly available physiology fields (heart-rate avg/max from padded enrichment,
 * energy, zones, recovery), `mergeAppleHealthWorkoutPhysiologyIfNeeded` in
 * `services/api/src/lib/mergeAppleHealthWorkoutPhysiologyIfNeeded.ts` patches the raw
 * doc additively and bumps `receivedAt`. This trigger then re-normalizes so the
 * canonical workout doc absorbs the new fields via the additive supersede path in
 * `writeCanonicalEventImmutable` (see `isWorkoutPhysiologyAdditiveSupersede`).
 *
 * NOTE: `strength_workout` is intentionally NOT widened in Phase B. Strength workouts
 * use a different payload shape (set-level data) and physiology enrichment is not yet
 * proven to route through them. Re-evaluate if/when strength physiology lands.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { processRawEventForNormalization } from "./processRawEventForNormalization";

const TRIGGER_OPTIONS = {
  document: "users/{userId}/rawEvents/{rawEventId}",
  region: "us-central1" as const,
  serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
};

export const onRawEventUpdatedForNormalization = onDocumentUpdated(TRIGGER_OPTIONS, async (event) => {
  const userId = event.params.userId;
  const rawEventId = event.params.rawEventId;
  if (typeof userId !== "string" || typeof rawEventId !== "string") return;

  const change = event.data;
  if (!change) return;

  const after = change.after.data() as Record<string, unknown> | undefined;
  const kind = after?.["kind"];
  if (kind !== "steps" && kind !== "sleep" && kind !== "workout") return;

  try {
    await processRawEventForNormalization({
      snapshot: change.after,
      pathUserId: userId,
      rawEventId,
      trigger: "update",
    });
  } catch (err) {
    logger.error("raw_event_updated_normalization_failed", {
      msg: "raw_event_updated_normalization_failed",
      userId,
      rawEventId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
