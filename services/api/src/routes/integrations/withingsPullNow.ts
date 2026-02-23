/**
 * W4A — POST /integrations/withings/pull-now (user-authenticated).
 * Triggers an immediate Withings pull for the authed user only: last 72h of measures,
 * idempotent RawEvent writes, deterministic summary. Fail-closed; requestId in all error responses.
 * Does NOT use requireInvokerAuth (user-initiated, authMiddleware).
 */

import { Router, type Request, type Response } from "express";
import { rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../../middleware/auth";
import { FieldValue, userCollection, withingsConnectedRegistryDoc } from "../../db";
import { fetchWithingsMeasures, WithingsMeasureError } from "../../lib/withingsMeasures";
import * as withingsSecrets from "../../lib/withingsSecrets";
import { writeFailure } from "../../lib/writeFailure";
import { logger } from "../../lib/logger";

const router = Router();

const WINDOW_MS = 72 * 60 * 60 * 1000;
const WINDOW_HOURS = 72;

function getRequestId(req: Request): string {
  return (req as AuthedRequest).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

function isInvalidRefreshToken(code: string, message: string): boolean {
  return (
    code === "WITHINGS_TOKEN_REFRESH_FAILED" &&
    message.toLowerCase().includes("invalid refresh_token")
  );
}

async function performReconnectCleanupBestEffort(
  uid: string,
  requestId: string,
): Promise<void> {
  try {
    await withingsSecrets.deleteRefreshToken(uid);
    await userCollection(uid, "integrations").doc("withings").set(
      {
        connected: false,
        revoked: false,
        failureState: {
          code: "WITHINGS_REFRESH_TOKEN_INVALID",
          message: "Withings connection expired. Please reconnect.",
          lastOccurredAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    await withingsConnectedRegistryDoc(uid).delete();
  } catch (cleanupErr) {
    const sanitized = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
    logger.error({
      msg: "withings_pull_now_reconnect_cleanup_error",
      uid,
      requestId,
      err: sanitized,
    });
  }
}

/** Derive day (YYYY-MM-DD) from ISO timestamp in UTC. */
function toYmdUtc(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * POST /integrations/withings/pull-now
 * User-authenticated. Pulls last 72h for req.uid only; writes RawEvents or FailureEntry.
 */
router.post("/", async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const uid = (req as AuthedRequest).uid;

  if (!uid) {
    return res.status(401).json({
      ok: false as const,
      error: {
        code: "UNAUTHORIZED" as const,
        message: "Unauthorized",
        requestId,
      },
    });
  }

  let eventsCreated = 0;
  let eventsAlreadyExists = 0;
  let failuresWritten = 0;
  let failureWriteErrors = 0;

  const endMs = Date.now();
  const startMs = endMs - WINDOW_MS;

  let samples;
  try {
    samples = await fetchWithingsMeasures(uid, startMs, endMs);
  } catch (err) {
    const code = err instanceof WithingsMeasureError ? err.code : "WITHINGS_MEASURE_ERROR";
    const message = err instanceof Error ? err.message : String(err);
    if (isInvalidRefreshToken(code, message)) {
      await performReconnectCleanupBestEffort(uid, requestId);
    }
    logger.error({
      msg: "withings_pull_now_fetch_failed",
      rid: requestId,
      uid,
      code,
      err: message,
    });
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "withings.pullNow",
        reasonCode: code,
        message,
        day: toYmdUtc(new Date().toISOString()),
        details: {},
        requestId,
      });
      failuresWritten += 1;
    } catch (writeErr) {
      failureWriteErrors += 1;
      logger.error({
        msg: "withings_pull_now_failure_write_error",
        uid,
        requestId,
        err: writeErr instanceof Error ? writeErr.message : String(writeErr),
      });
    }
    return res.status(502).json({
      ok: false as const,
      error: {
        code: "WITHINGS_FETCH_FAILED" as const,
        message: "Withings measure fetch failed",
        requestId,
      },
    });
  }

  const rawEventsCol = userCollection(uid, "rawEvents");
  const receivedAt = new Date().toISOString();

  for (const s of samples) {
    const docRef = rawEventsCol.doc(s.idempotencyKey);

    const payload = {
      time: s.measuredAtIso,
      timezone: "UTC",
      weightKg: s.weightKg,
      ...(s.bodyFatPercent !== null ? { bodyFatPercent: s.bodyFatPercent } : {}),
    };

    const doc = {
      id: s.idempotencyKey,
      userId: uid,
      sourceId: "withings",
      sourceType: "withings",
      provider: "manual",
      kind: "weight" as const,
      receivedAt,
      observedAt: s.measuredAtIso,
      payload,
      schemaVersion: 1 as const,
    };

    const validated = rawEventDocSchema.safeParse(doc);
    if (!validated.success) {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "withings.pullNow.schema",
          reasonCode: "RAW_EVENT_SCHEMA_INVALID",
          message: "Invalid weight RawEvent payload",
          day: toYmdUtc(s.measuredAtIso),
          rawEventId: s.idempotencyKey,
          details: validated.error.flatten(),
          requestId,
        });
        failuresWritten += 1;
      } catch (writeErr) {
        failureWriteErrors += 1;
        logger.error({
          msg: "withings_pull_now_failure_write_error",
          uid,
          rawEventId: s.idempotencyKey,
          requestId,
          err: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      }
      continue;
    }

    try {
      await docRef.create(validated.data);
      eventsCreated += 1;
    } catch (err: unknown) {
      const existing = await docRef.get();
      if (existing.exists) {
        eventsAlreadyExists += 1;
        continue;
      }

      const msg = err instanceof Error ? err.message : String(err);
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "withings.pullNow.write",
          reasonCode: "RAW_EVENT_WRITE_FAILED",
          message: msg,
          day: toYmdUtc(s.measuredAtIso),
          rawEventId: s.idempotencyKey,
          details: {},
          requestId,
        });
        failuresWritten += 1;
      } catch (writeErr) {
        failureWriteErrors += 1;
        logger.error({
          msg: "withings_pull_now_failure_write_error",
          uid,
          rawEventId: s.idempotencyKey,
          requestId,
          err: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      }
    }
  }

  try {
    const integrationRef = userCollection(uid, "integrations").doc("withings");
    await integrationRef.set(
      { lastSyncAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch (metaErr) {
    logger.error({
      msg: "withings_pull_now_metadata_error",
      uid,
      requestId,
      err: metaErr instanceof Error ? metaErr.message : String(metaErr),
    });
    return res.status(500).json({
      ok: false as const,
      error: {
        code: "INTERNAL" as const,
        message: "Failed to update lastSyncAt",
        requestId,
      },
    });
  }

  return res.status(200).json({
    ok: true as const,
    requestId,
    windowHours: WINDOW_HOURS,
    eventsCreated,
    eventsAlreadyExists,
    failuresWritten,
    failureWriteErrors,
  });
});

export default router;
