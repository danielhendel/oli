// services/functions/src/realtime/onCanonicalEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, YmdDateString } from "../types/health";
import { recomputeDerivedTruthForDay } from "../pipeline/recomputeForDay";

const FUNCTION_REGION = "us-central1";
const RUNTIME_SERVICE_ACCOUNT = "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com";

export const onCanonicalEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/events/{eventId}",
    region: FUNCTION_REGION,
    serviceAccount: RUNTIME_SERVICE_ACCOUNT,
  },
  async (event) => {
    const userId = String(event.params.userId);
    const eventId = String(event.params.eventId);

    const canonical = event.data?.data() as CanonicalEvent | undefined;
    if (!canonical) {
      logger.warn("onCanonicalEventCreated: missing canonical event data", { userId, eventId });
      return;
    }

    const day = canonical.day as YmdDateString;

    /**
     * Steps normalization always calls {@link recomputeDerivedTruthForDay} from
     * {@link processRawEventForNormalization} after the canonical write (create/replace/noop).
     * Skipping here avoids a second async recompute racing a fast intraday raw update: a slow
     * create-triggered recompute could otherwise read an early cumulative total and overwrite
     * dailyFacts after a later ingest had already written the correct higher total.
     */
    if (canonical.kind === "steps") {
      logger.info("Realtime recompute skipped for steps (handled by raw normalization)", {
        userId,
        eventId,
        day,
        kind: canonical.kind,
      });
      return;
    }

    logger.info("Realtime recompute started", { userId, eventId, day, kind: canonical.kind });
    await recomputeDerivedTruthForDay({
      db,
      userId,
      dayKey: day,
      trigger: { type: "realtime", eventId },
    });
    logger.info("Realtime recompute completed", { userId, day, eventId, kind: canonical.kind });
  },
);