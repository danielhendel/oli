// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { processRawEventForNormalization } from "./processRawEventForNormalization";

/**
 * Firestore trigger:
 *   Input:  /users/{userId}/rawEvents/{rawEventId}
 *   Output: /users/{userId}/events/{canonicalEventId}
 *
 * Canonical persistence uses {@link writeCanonicalEventImmutable} inside
 * {@link processRawEventForNormalization} (steps may advance intraday; other kinds stay immutable).
 *
 * See {@link processRawEventForNormalization} for behavior.
 *
 * Note: ingest idempotency replays update the same doc id without a second create;
 * those are handled by {@link onRawEventUpdatedForNormalization} (steps) so
 * normalization can run after mapper fixes without requiring a new raw doc.
 */
export const onRawEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/rawEvents/{rawEventId}",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    await processRawEventForNormalization({
      snapshot,
      pathUserId: event.params.userId,
      rawEventId: event.params.rawEventId,
      trigger: "create",
    });
  },
);
