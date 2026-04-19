// services/functions/src/normalization/onRawEventUpdatedForNormalization.ts

/**
 * Re-runs raw → canonical normalization when a steps or sleep rawEvent document is updated.
 *
 * Ingest uses deterministic raw doc ids (Idempotency-Key). After the first create,
 * replays return 202 without a second `onCreate`. If normalization failed under an
 * older mapper (e.g. apple_health steps), a subsequent replay must still be able to
 * produce canonical events. The API bumps `receivedAt` on steps replays; this
 * trigger picks up those writes.
 *
 * Sleep: payload may gain rem/deep stage minutes after mapper/ingest upgrades; operators patch
 * raw docs with a newer `receivedAt` so canonical + DailyFacts can be refreshed.
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
  if (kind !== "steps" && kind !== "sleep") return;

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
