/**
 * POST /integrations/oura/sleep-day-refresh — authenticated: Oura pull-now core + recompute for one day.
 * Used by Sleep pull-to-refresh on the latest calendar day so the client matches manual pull + recompute.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";

import type { AuthedRequest } from "../../middleware/auth";
import { db } from "../../db";
import { getRecomputeDerivedTruthForDay } from "../../lib/loadRecomputeDerivedTruthForDay";
import { logger } from "../../lib/logger";
import { performOuraPullNowCore } from "./ouraPullNow";

const router = Router();

const bodySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function getRequestId(req: Request): string {
  return (req as AuthedRequest).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

function getIdempotencyKey(req: Request): string | undefined {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  return fromHeader?.trim() || undefined;
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const uid = (req as AuthedRequest).uid;
  const rid = getRequestId(req);

  if (!uid) {
    res.status(401).json({
      ok: false as const,
      error: {
        code: "UNAUTHORIZED" as const,
        message: "Unauthorized",
        requestId: rid,
      },
    });
    return;
  }

  const idem = getIdempotencyKey(req);
  if (!idem) {
    res.status(400).json({
      ok: false as const,
      error: {
        code: "IDEMPOTENCY_KEY_REQUIRED" as const,
        message: "Idempotency-Key header is required",
        requestId: rid,
      },
    });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false as const,
      error: {
        code: "INVALID_BODY" as const,
        message: "Invalid request body",
        requestId: rid,
      },
    });
    return;
  }

  const { day } = parsed.data;

  try {
    const pull = await performOuraPullNowCore(uid, rid);
    if (pull.statusCode < 200 || pull.statusCode >= 300) {
      res.status(pull.statusCode).json(pull.body);
      return;
    }

    await getRecomputeDerivedTruthForDay()({
      db,
      userId: uid,
      dayKey: day,
      trigger: { type: "admin", source: "oura_sleep_day_refresh" },
    });

    res.status(200).json({
      ok: true as const,
      requestId: rid,
      day,
      pullNowStatus: pull.statusCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      msg: "oura_sleep_day_refresh_failed",
      rid,
      uid,
      day,
      err: message,
    });
    res.status(500).json({
      ok: false as const,
      error: {
        code: "SLEEP_DAY_REFRESH_FAILED" as const,
        message,
        requestId: rid,
      },
    });
  }
});

export default router;
