// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { mapRawEventToCanonical } from "./mapRawEventToCanonical";
import { parseRawEvent } from "../validation/rawEvent";
import { writeCanonicalEventImmutable } from "./writeCanonicalEventImmutable";
import { upsertRawEventDedupeEvidence } from "../ingestion/rawEventDedupe";
import { writeFailureImmutable } from "../failures/writeFailureImmutable";

function toYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function deriveDayFromRaw(raw: Record<string, unknown> | undefined): string | null {
  if (!raw) return null;
  const observedAt = raw["observedAt"];
  const timeZone = raw["timeZone"];
  if (typeof observedAt !== "string" || typeof timeZone !== "string") return null;
  try {
    const d = new Date(observedAt);
    if (Number.isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone });
    return fmt.format(d);
  } catch {
    return null;
  }
}

/** Bounded zod issue summary (no raw payload dumps) */
function boundedZodSummary(issues: unknown): Record<string, unknown> {
  if (!issues || typeof issues !== "object") return { _: "unknown" };
  const obj = issues as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (Array.isArray(obj["formErrors"])) out.formErrors = obj.formErrors;
  if (obj["fieldErrors"] && typeof obj.fieldErrors === "object") {
    const fe = obj.fieldErrors as Record<string, unknown>;
    out.fieldErrors = Object.keys(fe)
      .slice(0, 10)
      .reduce((acc, k) => {
        acc[k] = fe[k];
        return acc;
      }, {} as Record<string, unknown>);
  }
  return Object.keys(out).length > 0 ? out : { _: "validation_failed" };
}

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
      const rawData = snapshot.data() as Record<string, unknown> | undefined;
      const day = deriveDayFromRaw(rawData) ?? toYmdUtc(new Date());
      try {
        await writeFailureImmutable(
          {},
          {
            userId: event.params.userId,
            source: "normalization",
            stage: "rawEvent.validate",
            reasonCode: "RAW_EVENT_INVALID",
            message: "RawEvent failed contract validation",
            day,
            rawEventId: event.params.rawEventId,
            details: boundedZodSummary(parsed.issues),
          },
        );
      } catch (err) {
        logger.error("Failed to write failure record", {
          path: snapshot.ref.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
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
      const day = deriveDayFromRaw(snapshot.data() as Record<string, unknown>) ?? toYmdUtc(new Date());
      const reasonCode =
        result.reason === "UNSUPPORTED_KIND" ? "RAW_KIND_UNSUPPORTED" : "NORMALIZE_ERROR";
      try {
        await writeFailureImmutable(
          {},
          {
            userId: rawEvent.userId,
            source: "normalization",
            stage: "normalize.map",
            reasonCode,
            message: `Normalization failed: ${result.reason}`,
            day,
            rawEventId: rawEvent.id,
            ...(result.details ? { details: result.details } : {}),
          },
        );
      } catch (err) {
        logger.error("Failed to write failure record (normalize.map)", {
          userId: rawEvent.userId,
          rawEventId: rawEvent.id,
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
      try {
        await writeFailureImmutable(
          {},
          {
            userId: rawEvent.userId,
            source: "normalization",
            stage: "canonical.write",
            reasonCode: "CANONICAL_IMMUTABILITY_CONFLICT",
            message: "Canonical immutability conflict: attempted overwrite with different content",
            day: canonical.day,
            rawEventId: rawEvent.id,
            canonicalEventId: canonical.id,
            details: {
              existingHash: writeRes.existingHash,
              incomingHash: writeRes.incomingHash,
            },
          },
        );
      } catch (err) {
        logger.error("Failed to write failure record (canonical.write)", {
          userId: rawEvent.userId,
          canonicalId: canonical.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  },
);
