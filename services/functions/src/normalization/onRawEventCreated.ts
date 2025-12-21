// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { db } from "../firebaseAdmin";
import { mapRawEventToCanonical } from "./mapRawEventToCanonical";
import { parseRawEvent } from "../validation/rawEvent";

/**
 * Firestore trigger:
 *   Input:  /users/{userId}/rawEvents/{rawEventId}
 *   Output: /users/{userId}/events/{canonicalEventId}
 *
 * Behavior:
 * - Validates RawEvent envelope strictly (fail fast).
 * - Maps RawEvent → CanonicalEvent via pure mapper.
 * - Logs failures (no silent drops).
 * - Avoids logging any user PII.
 */
export const onRawEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/rawEvents/{rawEventId}",
    region: "us-central1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const parsed = parseRawEvent(snapshot.data());
    if (!parsed.ok) {
      logger.warn("Invalid RawEvent envelope (dropping)", {
        path: snapshot.ref.path,
        reason: parsed.reason,
      });
      return;
    }

    const rawEvent = parsed.value;

    // Optional extra guard: ensure doc path user matches payload userId
    const pathUserId = event.params.userId;
    if (rawEvent.userId !== pathUserId) {
      logger.warn("RawEvent userId mismatch (dropping)", {
        path: snapshot.ref.path,
        pathUserId,
        rawUserId: rawEvent.userId,
      });
      return;
    }

    const result = mapRawEventToCanonical(rawEvent);

    if (!result.ok) {
      logger.warn("Normalization failed", {
        userId: rawEvent.userId,
        rawEventId: rawEvent.id,
        provider: rawEvent.provider,
        kind: rawEvent.kind,
        reason: result.reason,
      });
      return;
    }

    const canonical = result.canonical;

    await db.collection("users").doc(rawEvent.userId).collection("events").doc(canonical.id).set(canonical);
  }
);
