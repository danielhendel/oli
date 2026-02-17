/**
 * Phase 3B.1 — POST /integrations/withings/backfill (invoker-only).
 * Chunked historical import: newest → oldest, resume-safe cursor, deterministic idempotency.
 * Writes RawEvents (doc ID = idempotency key); on failure writes FailureEntry.
 * Never uses user auth; protected by requireInvokerAuth only.
 *
 * Constitutional: no silent drops, fail-closed on errors, no token logging, no schema drift.
 */

import { Router, type Request, type Response } from "express";
import { rawEventDocSchema } from "@oli/contracts";
import { userCollection, FieldValue, withingsConnectedRegistryCollection } from "../db";
import { fetchWithingsMeasures, WithingsMeasureError } from "../lib/withingsMeasures";
import { writeFailure } from "../lib/writeFailure";
import { logger } from "../lib/logger";

const router = Router();

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

/** Backfill status stored in users/{uid}/integrations/withings.backfill */
export type BackfillStatus = "idle" | "running" | "complete" | "error";

export type BackfillLastError = {
  code: string;
  message: string;
  atIso: string;
};

/** Default body values when not provided. */
const BODY_DEFAULTS = {
  yearsBack: 10,
  chunkDays: 90,
  maxChunks: 5,
};

function parseBody(
  raw: unknown,
): { mode: "start" | "resume" | "stop"; yearsBack: number; chunkDays: number; maxChunks: number } | null {
  if (raw == null || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const mode = b.mode;
  if (mode !== "start" && mode !== "resume" && mode !== "stop") return null;

  const yearsBack = typeof b.yearsBack === "number" ? b.yearsBack : BODY_DEFAULTS.yearsBack;
  const chunkDays = typeof b.chunkDays === "number" ? b.chunkDays : BODY_DEFAULTS.chunkDays;
  const maxChunks = typeof b.maxChunks === "number" ? b.maxChunks : BODY_DEFAULTS.maxChunks;

  if (yearsBack < 1 || yearsBack > 20) return null;
  if (chunkDays < 7 || chunkDays > 180) return null;
  if (maxChunks < 1 || maxChunks > 20) return null;

  return { mode, yearsBack, chunkDays, maxChunks };
}

/**
 * Get UIDs with connected Withings from deterministic registry (no collectionGroup).
 * Path: system/integrations/withings_connected/{uid}; doc has { connected: true, updatedAt }.
 */
async function getConnectedWithingsUids(): Promise<string[]> {
  const snap = await withingsConnectedRegistryCollection().get();
  const uids: string[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data?.connected === true) uids.push(doc.id);
  }
  return uids;
}

function toYmdUtc(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** POST /integrations/withings/backfill */
router.post("/", async (req: Request, res: Response) => {
  const parsed = parseBody(req.body);
  if (!parsed) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "BAD_REQUEST" as const,
        message:
          "Invalid body: mode required; yearsBack 1-20, chunkDays 7-180, maxChunks 1-20",
      },
    });
  }

  const { mode, yearsBack, chunkDays, maxChunks } = parsed;

  let usersProcessed = 0;
  let eventsCreated = 0;
  let eventsAlreadyExists = 0;
  let failuresWritten = 0;
  let failureWriteErrors = 0;
  let backfillUpdated = 0;

  let uids: string[];
  try {
    uids = await getConnectedWithingsUids();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "withings_backfill_registry_error", err: msg });
    return res.status(200).json({
      ok: false as const,
      usersProcessed: 0,
      eventsCreated: 0,
      eventsAlreadyExists: 0,
      failuresWritten: 0,
      failureWriteErrors: 0,
      backfillUpdated: 0,
      error: { code: "REGISTRY_ERROR" as const, message: "Registry read failed; no users processed" },
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const cursorStartSec = nowSec - yearsBack * SECONDS_PER_YEAR;

  for (const uid of uids) {
    usersProcessed += 1;
    const ref = userCollection(uid, "integrations").doc("withings");

    if (mode === "stop") {
      try {
        await ref.set(
          {
            backfill: {
              status: "idle" as const,
              updatedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        );
        backfillUpdated += 1;
      } catch (err) {
        logger.error({
          msg: "withings_backfill_stop_update_error",
          uid,
          err: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    if (mode === "start") {
      try {
        await ref.set(
          {
            backfill: {
              status: "running" as const,
              yearsBack,
              chunkDays,
              maxChunksPerRun: maxChunks,
              cursorStartSec,
              cursorEndSec: nowSec,
              processedCount: 0,
              lastError: null,
              updatedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        );
        backfillUpdated += 1;
      } catch (err) {
        logger.error({
          msg: "withings_backfill_start_update_error",
          uid,
          err: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    // mode === "resume"
    let snap;
    try {
      snap = await ref.get();
    } catch (err) {
      logger.error({
        msg: "withings_backfill_resume_read_error",
        uid,
        err: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    if (!snap.exists) continue;

    const data = snap.data() as
      | {
          backfill?: {
            status?: string;
            cursorStartSec?: number;
            cursorEndSec?: number;
            processedCount?: number;
            chunkDays?: number;
            maxChunksPerRun?: number;
            lastError?: BackfillLastError | null;
          };
        }
      | undefined;

    const backfill = data?.backfill;

    // ✅ Tight semantics: stop means stop; only resume when running/error.
    if (!backfill) continue;
    if (backfill.status === "complete") continue;
    if (backfill.status === "idle") continue;

    const runChunkDays =
      typeof backfill.chunkDays === "number" ? backfill.chunkDays : chunkDays;
    const runMaxChunks =
      typeof backfill.maxChunksPerRun === "number" ? backfill.maxChunksPerRun : maxChunks;

    let cursorEndSec =
      typeof backfill.cursorEndSec === "number" ? backfill.cursorEndSec : nowSec;
    const cursorStart =
      typeof backfill.cursorStartSec === "number" ? backfill.cursorStartSec : cursorStartSec;

    let processedCount =
      typeof backfill.processedCount === "number" ? backfill.processedCount : 0;

    const chunkSec = runChunkDays * SECONDS_PER_DAY;

    let chunksDone = 0;
    let userEventsCreated = 0;
    let userEventsAlreadyExists = 0;
    let userFailuresWritten = 0;

    let status: BackfillStatus = (backfill.status as BackfillStatus) ?? "running";
    let lastError: BackfillLastError | null =
      (backfill.lastError as BackfillLastError | null | undefined) ?? null;

    while (chunksDone < runMaxChunks) {
      const windowEndSec = cursorEndSec;
      const windowStartSec = Math.max(cursorStart, windowEndSec - chunkSec);

      const windowStartMs = windowStartSec * 1000;
      const windowEndMs = windowEndSec * 1000;

      let samples;
      try {
        samples = await fetchWithingsMeasures(uid, windowStartMs, windowEndMs);
      } catch (err) {
        const code = err instanceof WithingsMeasureError ? err.code : "WITHINGS_MEASURE_ERROR";
        const message = err instanceof Error ? err.message : String(err);
        try {
          await writeFailure({
            userId: uid,
            source: "ingestion",
            stage: "withings.backfill",
            reasonCode: code,
            message,
            day: toYmdUtc(new Date().toISOString()),
            details: {},
          });
          userFailuresWritten += 1;
        } catch (writeErr) {
          failureWriteErrors += 1;
          logger.error({
            msg: "withings_backfill_failure_write_error",
            uid,
            err: writeErr instanceof Error ? writeErr.message : String(writeErr),
          });
        }
        status = "error";
        lastError = { code, message, atIso: new Date().toISOString() };
        break;
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
          provider: "withings",
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
              stage: "withings.backfill.schema",
              reasonCode: "RAW_EVENT_SCHEMA_INVALID",
              message: "Invalid weight RawEvent payload",
              day: toYmdUtc(s.measuredAtIso),
              rawEventId: s.idempotencyKey,
              details: validated.error.flatten(),
            });
            userFailuresWritten += 1;
          } catch (writeErr) {
            failureWriteErrors += 1;
            logger.error({
              msg: "withings_backfill_failure_write_error",
              uid,
              rawEventId: s.idempotencyKey,
              err: writeErr instanceof Error ? writeErr.message : String(writeErr),
            });
          }
          continue;
        }

        try {
          await docRef.create(validated.data);
          userEventsCreated += 1;
        } catch (err: unknown) {
          const existing = await docRef.get();
          if (existing.exists) {
            userEventsAlreadyExists += 1;
            continue;
          }

          const msg = err instanceof Error ? err.message : String(err);
          try {
            await writeFailure({
              userId: uid,
              source: "ingestion",
              stage: "withings.backfill.write",
              reasonCode: "RAW_EVENT_WRITE_FAILED",
              message: msg,
              day: toYmdUtc(s.measuredAtIso),
              rawEventId: s.idempotencyKey,
              details: {},
            });
            userFailuresWritten += 1;
          } catch (writeErr) {
            failureWriteErrors += 1;
            logger.error({
              msg: "withings_backfill_failure_write_error",
              uid,
              rawEventId: s.idempotencyKey,
              err: writeErr instanceof Error ? writeErr.message : String(writeErr),
            });
          }
        }
      }

      processedCount += samples.length;
      cursorEndSec = windowStartSec;
      chunksDone += 1;

      if (cursorEndSec <= cursorStart) {
        status = "complete";
        break;
      }
    }

    eventsCreated += userEventsCreated;
    eventsAlreadyExists += userEventsAlreadyExists;
    failuresWritten += userFailuresWritten;

    try {
      await ref.set(
        {
          backfill: {
            status,
            yearsBack,
            chunkDays: runChunkDays,
            maxChunksPerRun: runMaxChunks,
            cursorStartSec: cursorStart,
            cursorEndSec,
            processedCount,
            lastError,
            updatedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
      backfillUpdated += 1;
    } catch (err) {
      logger.error({
        msg: "withings_backfill_cursor_update_error",
        uid,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return res.status(200).json({
    ok: true as const,
    usersProcessed,
    eventsCreated,
    eventsAlreadyExists,
    failuresWritten,
    failureWriteErrors,
    backfillUpdated,
  });
});

export default router;
