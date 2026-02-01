// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { mapRawEventToCanonical } from "./mapRawEventToCanonical";
import { parseRawEvent } from "../validation/rawEvent";
import { writeCanonicalEventImmutable } from "./writeCanonicalEventImmutable";
import { upsertRawEventDedupeEvidence } from "../ingestion/rawEventDedupe";
import { writeFailureEntry } from "../failures/writeFailureEntry";

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
 *
 * Phase 1 / Step 8 invariant:
 * - No silent drops: all failure paths must write a FailureEntry into:
 *     /users/{userId}/failures/{failureId}
 *   Client is read-only; writes are server-only.
 */

function getTimeZoneFromRawDoc(rawDoc: unknown): string | null {
  // NOTE:
  // - The authoritative ingestion contract (@oli/contracts) may include `timeZone`
  // - But the Functions-layer RawEvent interface does NOT currently expose it.
  // - Therefore, for Step 8 we extract it from the raw Firestore doc safely.
  if (!rawDoc || typeof rawDoc !== "object") return null;
  const tz = (rawDoc as Record<string, unknown>)["timeZone"];
  return typeof tz === "string" && tz.trim().length > 0 ? tz : null;
}

export const onRawEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/rawEvents/{rawEventId}",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const pathUserId = event.params.userId;
    const pathRawEventId = event.params.rawEventId;

    const rawDoc = snapshot.data();
    const timeZoneFromDoc = getTimeZoneFromRawDoc(rawDoc);

    const parsed = parseRawEvent(rawDoc);
    if (!parsed.ok) {
      logger.warn("Invalid RawEvent envelope (dropping)", {
        path: snapshot.ref.path,
        reason: parsed.reason,
      });

      // Step 8: persist failure memory (best-effort, payload-safe, idempotent)
      const code = "RAW_EVENT_CONTRACT_INVALID";
      const failureId = `raw_${pathRawEventId}_${code}`;

      try {
        await writeFailureEntry({
          userId: pathUserId,
          failureId,
          type: "RAW_EVENT_INVALID",
          code,
          message: "Invalid RawEvent envelope; normalization dropped the event.",
          rawEventId: pathRawEventId,
          rawEventPath: snapshot.ref.path,
          details: {
            reason: parsed.reason,
          },
        });
      } catch (err) {
        // Never throw; trigger stability > reporting.
        logger.error("Failed to persist failure memory for invalid RawEvent", {
          path: snapshot.ref.path,
          userId: pathUserId,
          rawEventId: pathRawEventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return;
    }

    const rawEvent = parsed.value;

    // Optional extra guard: ensure doc path user matches payload userId
    if (rawEvent.userId !== pathUserId) {
      logger.warn("RawEvent userId mismatch (dropping)", {
        path: snapshot.ref.path,
        pathUserId,
        rawUserId: rawEvent.userId,
      });

      // Step 8: persist failure memory (best-effort, payload-safe, idempotent)
      const code = "RAW_EVENT_USER_MISMATCH";
      const failureId = `raw_${pathRawEventId}_${code}`;

      try {
        await writeFailureEntry({
          userId: pathUserId,
          failureId,
          type: "RAW_EVENT_INVALID",
          code,
          message: "RawEvent userId mismatch between document path and payload; dropped.",
          rawEventId: pathRawEventId,
          rawEventPath: snapshot.ref.path,
          details: {
            pathUserId,
            rawUserId: rawEvent.userId,
          },
        });
      } catch (err) {
        logger.error("Failed to persist failure memory for RawEvent user mismatch", {
          path: snapshot.ref.path,
          userId: pathUserId,
          rawEventId: pathRawEventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return;
    }

    // Step 2: record duplicate/replay evidence (does not alter ingestion behavior).
    // Validate contract-first inside the dedupe helper by passing the raw snapshot data.
    try {
      const dedupe = await upsertRawEventDedupeEvidence({
        userId: rawEvent.userId,
        rawEvent: rawDoc,
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
        ...(result.details ? { details: result.details } : {}),
      });

      // Step 8: persist failure memory (best-effort, payload-safe, idempotent)
      const code = result.reason;
      const failureId = `raw_${pathRawEventId}_${code}`;

      try {
        await writeFailureEntry({
          userId: rawEvent.userId,
          failureId,
          type: "NORMALIZATION_FAILED",
          code,
          message: "Normalization mapping failed; canonical event not produced.",
          rawEventId: pathRawEventId,
          rawEventPath: snapshot.ref.path,
          observedAt: rawEvent.observedAt ?? null,
          timeZone: timeZoneFromDoc,
          details: result.details ?? null,
        });
      } catch (err) {
        logger.error("Failed to persist failure memory for normalization failure", {
          userId: rawEvent.userId,
          rawEventId: rawEvent.id,
          provider: rawEvent.provider,
          kind: rawEvent.kind,
          code,
          error: err instanceof Error ? err.message : String(err),
        });
      }

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
