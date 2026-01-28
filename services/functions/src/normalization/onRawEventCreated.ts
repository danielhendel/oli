// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { mapRawEventToCanonical } from "./mapRawEventToCanonical";
import { parseRawEvent } from "../validation/rawEvent";
import { writeCanonicalEventImmutable } from "./writeCanonicalEventImmutable";
import { upsertRawEventDedupeEvidence } from "../ingestion/rawEventDedupe";

/**
 * Firestore trigger:
 *   Input:  /users/{userId}/rawEvents/{rawEventId}
 *   Output: /users/{userId}/events/{canonicalEventId}
 *
 * Behavior:
 * - Validates RawEvent envelope strictly (fail fast).
 * - Records replay/duplicate evidence (no silent duplication).
 * - Maps RawEvent → CanonicalEvent via pure mapper.
 * - Writes canonical truth immutably (create-only OR identical-on-replay).
 * - Logs failures (no silent drops).
 * - Avoids logging any user PII.
 *
 * Phase 1 / Step 1 invariant:
 * - Canonical `day` must be derived deterministically from the authoritative time anchor
 *   and timezone, using Intl.DateTimeFormat("en-CA", { timeZone }).
 *   (Enforced inside mapRawEventToCanonical; this trigger preserves that authority.)
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

    // Step 2: record duplicate/replay evidence (does not alter ingestion behavior).
    // Validate contract-first inside the dedupe helper by passing the raw snapshot data.
    try {
      const dedupe = await upsertRawEventDedupeEvidence({
        userId: rawEvent.userId,
        rawEvent: snapshot.data(),
      });

      if (!dedupe.ok) {
        logger.warn("RawEvent dedupe evidence skipped due to invalid contract", {
          path: snapshot.ref.path,
          userId: rawEvent.userId,
        });
      }
    } catch (err) {
      // Never throw: ingestion must remain stable and retries would create noise.
      logger.error("Failed to write RawEvent dedupe evidence", {
        userId: rawEvent.userId,
        rawEventId: rawEvent.id,
        provider: rawEvent.provider,
        kind: rawEvent.kind,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Pure deterministic normalization
    const result = mapRawEventToCanonical(rawEvent);

    if (!result.ok) {
      logger.warn("Normalization failed", {
        userId: rawEvent.userId,
        rawEventId: rawEvent.id,
        provider: rawEvent.provider,
        kind: rawEvent.kind,
        reason: result.reason,
        // Include details only if provided, but keep it safe (no payload).
        ...(result.details ? { details: result.details } : {}),
      });
      return;
    }

    const canonical = result.canonical;

    const writeRes = await writeCanonicalEventImmutable({
      userId: rawEvent.userId,
      canonical,
      sourceRawEventId: rawEvent.id,
      sourceRawEventPath: snapshot.ref.path,
    });

    if (!writeRes.ok) {
      // Important: do not throw (would cause retries and noise).
      // This is a real integrity violation that must be investigated.
      logger.error("Canonical write conflict: immutability prevented overwrite", {
        userId: rawEvent.userId,
        canonicalId: canonical.id,
        existingHash: writeRes.existingHash,
        incomingHash: writeRes.incomingHash,
        integrityViolationPath: writeRes.integrityViolationPath,
      });
    }
  },
);