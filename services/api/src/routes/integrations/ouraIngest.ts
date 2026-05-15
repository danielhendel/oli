/**
 * POST /integrations/oura/ingest — Ingest Oura sleep and HRV as raw events.
 * Writes with provider "manual", sourceId "oura" so existing normalization accepts them.
 * Auth: JWT required. Body: sleep[] and/or hrv[] with manual-compatible payloads.
 * Each item must include idempotencyKey (used as rawEvent doc id); duplicate keys are skipped.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth";
import { writeOuraRawEvents } from "../../lib/ouraIngestWrite";

const router = Router();

function getRequestId(req: Request): string {
  return (req as AuthedRequest).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

const sleepItemSchema = z.object({
  idempotencyKey: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  timezone: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  totalMinutes: z.number().finite().nonnegative(),
  efficiency: z.number().finite().min(0).max(1).nullable().optional(),
  latencyMinutes: z.number().finite().nonnegative().nullable().optional(),
  awakenings: z.number().finite().nonnegative().nullable().optional(),
  isMainSleep: z.boolean(),
});

const hrvItemSchema = z.object({
  idempotencyKey: z.string().min(1),
  time: z.string().min(1),
  timezone: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rmssdMs: z.number().finite().nonnegative().nullable().optional(),
  sdnnMs: z.number().finite().nonnegative().nullable().optional(),
  measurementType: z.enum(["nightly", "spot"]).optional(),
  restingHeartRateBpm: z.number().finite().min(1).max(250).nullable().optional(),
});

const ouraIngestBodySchema = z.object({
  sleep: z.array(sleepItemSchema).optional(),
  hrv: z.array(hrvItemSchema).optional(),
}).refine(
  (data) => (data.sleep?.length ?? 0) + (data.hrv?.length ?? 0) > 0,
  { message: "At least one sleep or hrv item is required" },
);

function getIdempotencyKey(req: Request): string | undefined {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  return fromHeader?.trim() || undefined;
}

router.post("/", async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const uid = (req as AuthedRequest).uid;
  if (!uid) {
    return res.status(401).json({
      ok: false as const,
      error: { code: "UNAUTHORIZED" as const, message: "Unauthorized", requestId },
    });
  }

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "BAD_REQUEST" as const,
        message: "Idempotency-Key header is required for Oura ingest",
        requestId,
      },
    });
  }

  const parsed = ouraIngestBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "INVALID_BODY" as const,
        message: "Invalid request body",
        details: parsed.error.flatten(),
        requestId,
      },
    });
  }

  const { sleep = [], hrv = [] } = parsed.data;
  const sleepItems = sleep.map((item) => ({
    idempotencyKey: item.idempotencyKey,
    start: item.start,
    end: item.end,
    timezone: item.timezone,
    ...(item.day !== undefined ? { day: item.day } : {}),
    totalMinutes: item.totalMinutes,
    ...(item.efficiency !== undefined ? { efficiency: item.efficiency ?? null } : {}),
    ...(item.latencyMinutes !== undefined ? { latencyMinutes: item.latencyMinutes ?? null } : {}),
    ...(item.awakenings !== undefined ? { awakenings: item.awakenings ?? null } : {}),
    isMainSleep: item.isMainSleep,
  }));
  const hrvItems = hrv.map((item) => ({
    idempotencyKey: item.idempotencyKey,
    time: item.time,
    timezone: item.timezone,
    ...(item.day !== undefined ? { day: item.day } : {}),
    ...(item.rmssdMs !== undefined ? { rmssdMs: item.rmssdMs ?? null } : {}),
    ...(item.sdnnMs !== undefined ? { sdnnMs: item.sdnnMs ?? null } : {}),
    ...(item.measurementType !== undefined ? { measurementType: item.measurementType } : {}),
    ...(item.restingHeartRateBpm !== undefined
      ? { restingHeartRateBpm: item.restingHeartRateBpm ?? null }
      : {}),
  }));
  const { eventsCreated, eventsAlreadyExists } = await writeOuraRawEvents(
    uid,
    sleepItems,
    hrvItems,
    requestId,
  );

  return res.status(200).json({
    ok: true as const,
    requestId,
    eventsCreated,
    eventsAlreadyExists,
  });
});

export default router;
