/**
 * Phase 3B — POST /integrations/withings/pull (invoker-only).
 * Pulls last 72h of Withings weight + body fat for all connected users.
 * Writes RawEvents (doc ID = idempotency key); on failure writes FailureEntry.
 * Never uses user auth; protected by requireInvokerAuth only.
 *
 * Constitutional notes:
 * - No silent drops: if failure writing fails, we log with context and increment failureWriteErrors.
 * - Idempotency: RawEvent doc id is deterministic idempotencyKey; create() + exists => alreadyExists, not overwrite.
 * - Deterministic summary: report created vs alreadyExists separately (truth in reporting).
 */

import { Router, type Response } from "express";
import { rawEventDocSchema } from "@oli/contracts";
import { db, userCollection } from "../db";
import { fetchWithingsMeasures, WithingsMeasureError } from "../lib/withingsMeasures";
import { writeFailure } from "../lib/writeFailure";
import { logger } from "../lib/logger";

const router = Router();

const WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Get UIDs that have Withings connected (users/{uid}/integrations/withings, connected == true).
 * Uses collectionGroup query and filters doc.id to "withings" to avoid schema drift.
 */
async function getConnectedWithingsUids(): Promise<string[]> {
  const snap = await db.collectionGroup("integrations").where("connected", "==", true).get();
  const uids: string[] = [];
  for (const doc of snap.docs) {
    if (doc.id !== "withings") continue;
    const parent = doc.ref.parent.parent;
    if (parent) uids.push(parent.id);
  }
  return uids;
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
 * POST /integrations/withings/pull
 * Invoker-only. Pulls measures for each connected user; writes RawEvents or FailureEntry.
 */
router.post("/", async (_req, res: Response) => {
  let usersProcessed = 0;
  let eventsCreated = 0;
  let eventsAlreadyExists = 0;
  let failuresWritten = 0;
  let failureWriteErrors = 0;

  let uids: string[];
  try {
    uids = await getConnectedWithingsUids();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "withings_pull_query_error", err: msg });
    return res.status(500).json({
      ok: false as const,
      error: { code: "INTERNAL" as const, message: "Failed to query connected users" },
    });
  }

  const endMs = Date.now();
  const startMs = endMs - WINDOW_MS;

  for (const uid of uids) {
    usersProcessed += 1;

    let samples;
    try {
      samples = await fetchWithingsMeasures(uid, startMs, endMs);
    } catch (err) {
      const code = err instanceof WithingsMeasureError ? err.code : "WITHINGS_MEASURE_ERROR";
      const message = err instanceof Error ? err.message : String(err);
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "withings.pull",
          reasonCode: code,
          message,
          day: toYmdUtc(new Date().toISOString()),
          details: {},
        });
        failuresWritten += 1;
      } catch (writeErr) {
        failureWriteErrors += 1;
        logger.error({
          msg: "withings_pull_failure_write_error",
          uid,
          err: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      }
      continue;
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
        // NOTE: provider is left as "manual" only if the schema does not allow "withings".
        // If rawEventDocSchema allows provider="withings", prefer that instead.
        provider: "manual",
        kind: "weight",
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
            stage: "withings.pull.schema",
            reasonCode: "RAW_EVENT_SCHEMA_INVALID",
            message: "Invalid weight RawEvent payload",
            day: toYmdUtc(s.measuredAtIso),
            rawEventId: s.idempotencyKey,
            details: validated.error.flatten(),
          });
          failuresWritten += 1;
        } catch (writeErr) {
          failureWriteErrors += 1;
          logger.error({
            msg: "withings_pull_failure_write_error",
            uid,
            rawEventId: s.idempotencyKey,
            err: writeErr instanceof Error ? writeErr.message : String(writeErr),
          });
        }
        continue;
      }

      try {
        await docRef.create(validated.data);
        eventsCreated += 1;
      } catch (err: unknown) {
        // Idempotent replay: if doc exists, count as alreadyExists (truth in reporting)
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
            stage: "withings.pull.write",
            reasonCode: "RAW_EVENT_WRITE_FAILED",
            message: msg,
            day: toYmdUtc(s.measuredAtIso),
            rawEventId: s.idempotencyKey,
            details: {},
          });
          failuresWritten += 1;
        } catch (writeErr) {
          failureWriteErrors += 1;
          logger.error({
            msg: "withings_pull_failure_write_error",
            uid,
            rawEventId: s.idempotencyKey,
            err: writeErr instanceof Error ? writeErr.message : String(writeErr),
          });
        }
      }
    }
  }

  return res.status(200).json({
    ok: true as const,
    usersProcessed,
    eventsCreated,
    eventsAlreadyExists,
    failuresWritten,
    failureWriteErrors,
  });
});

export default router;
