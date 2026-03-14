/**
 * POST /integrations/oura/pull (invoker-only).
 * Pulls sleep + HRV from Oura for all connected users via performOuraPullNowCore.
 * Never uses user auth; protected by requireInvokerAuth only.
 *
 * Constitutional notes:
 * - No silent drops: if failure writing fails, we log and increment failureWriteErrors.
 * - Uses performOuraPullNowCore (shared with pull-now and callback); updates lastSyncAt on success.
 */

import { Router, type Request, type Response } from "express";
import { ouraConnectedRegistryCollection } from "../db";
import { performOuraPullNowCore } from "./integrations/ouraPullNow";
import { writeFailure } from "../lib/writeFailure";
import { logger } from "../lib/logger";
import type { RequestWithRid } from "../lib/logger";

const router = Router();

function getRequestId(req: Request): string {
  return (req as RequestWithRid).rid ?? (req.header("x-request-id") ?? "unknown").toString();
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
 * Get UIDs with connected Oura from registry.
 * Path: system/integrations/oura_connected/{uid}; doc has { connected: true, updatedAt }.
 */
async function getConnectedOuraUids(): Promise<string[]> {
  const snap = await ouraConnectedRegistryCollection().get();
  const uids: string[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data?.connected === true) uids.push(doc.id);
  }
  return uids;
}

/**
 * POST /integrations/oura/pull
 * Invoker-only. For each connected user, calls performOuraPullNowCore; on error writes FailureEntry and continues.
 */
router.post("/", async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  let usersProcessed = 0;
  let eventsCreated = 0;
  let eventsAlreadyExists = 0;
  let failuresWritten = 0;
  let failureWriteErrors = 0;

  let uids: string[];
  try {
    uids = await getConnectedOuraUids();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "oura_pull_query_error", err: msg, rid: requestId });
    return res.status(500).json({
      ok: false as const,
      error: { code: "INTERNAL" as const, message: "Failed to query connected users" },
    });
  }

  for (const uid of uids) {
    usersProcessed += 1;

    let result;
    try {
      result = await performOuraPullNowCore(uid, requestId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "oura.pull",
          reasonCode: "OURA_PULL_ERROR",
          message,
          day: toYmdUtc(new Date().toISOString()),
          details: {},
          requestId,
        });
        failuresWritten += 1;
      } catch (writeErr) {
        failureWriteErrors += 1;
        logger.error({
          msg: "oura_pull_failure_write_error",
          uid,
          rid: requestId,
          err: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      }
      continue;
    }

    if (result.statusCode === 200 && result.body && typeof result.body === "object") {
      const body = result.body as { eventsCreated?: number; eventsAlreadyExists?: number };
      eventsCreated += typeof body.eventsCreated === "number" ? body.eventsCreated : 0;
      eventsAlreadyExists += typeof body.eventsAlreadyExists === "number" ? body.eventsAlreadyExists : 0;
    } else {
      const message =
        result.body && typeof result.body === "object" && result.body.error && typeof result.body.error === "object"
          ? String((result.body.error as { message?: unknown }).message ?? "Oura pull failed")
          : "Oura pull failed";
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "oura.pull",
          reasonCode: "OURA_PULL_FAILED",
          message,
          day: toYmdUtc(new Date().toISOString()),
          details: { statusCode: result.statusCode },
          requestId,
        });
        failuresWritten += 1;
      } catch (writeErr) {
        failureWriteErrors += 1;
        logger.error({
          msg: "oura_pull_failure_write_error",
          uid,
          rid: requestId,
          err: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
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
