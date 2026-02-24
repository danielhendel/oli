/**
 * GET /integrations/apple-health/status — Apple Health connection status from rawEvents.
 * Auth: JWT required (authMiddleware). No GET path params.
 * Response: connected (true if any rawEvent with provider apple_health), lastSyncAt (receivedAt of most recent).
 */

import { Router, type Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { logger, type RequestWithRid } from "../../lib/logger";
import { writeFailure } from "../../lib/writeFailure";
import { userCollection } from "../../db";

const router = Router();

function getRid(req: AuthedRequest): string {
  return (req as unknown as RequestWithRid).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

function dayUtcNow(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/", async (req: AuthedRequest, res: Response) => {
  const requestId = getRid(req);
  const uid = req.uid!;

  try {
    const snap = await userCollection(uid, "rawEvents")
      .where("provider", "==", "apple_health")
      .orderBy("receivedAt", "desc")
      .limit(1)
      .get();

    const connected = !snap.empty;
    const firstDoc = snap.docs[0];
    let lastSyncAt: string | null = null;
    if (firstDoc?.exists) {
      const data = firstDoc.data() as { receivedAt?: unknown };
      const raw = data?.receivedAt;
      if (typeof raw === "string") {
        lastSyncAt = raw;
      } else if (raw != null && typeof (raw as { toDate?: () => Date }).toDate === "function") {
        lastSyncAt = (raw as { toDate: () => Date }).toDate().toISOString();
      }
    }

    return res.status(200).json({
      ok: true,
      requestId,
      connected,
      lastSyncAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.info({
      msg: "apple_health_status_failed",
      rid: requestId,
      uid,
      error: message,
    });
    const day = dayUtcNow();
    try {
      await writeFailure({
        userId: uid,
        source: "pipeline",
        stage: "apple_health_status",
        reasonCode: "STATUS_QUERY_FAILED",
        message: "Failed to query Apple Health status",
        day,
        requestId,
        details: { message },
      });
    } catch {
      // Best-effort; do not throw
    }
    return res.status(500).json({
      ok: false,
      requestId,
      error: {
        code: "STATUS_QUERY_FAILED",
        message: "Unable to load Apple Health status",
      },
    });
  }
});

export default router;
