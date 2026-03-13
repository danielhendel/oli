/**
 * POST /integrations/oura/ingest — Ingest Oura sleep and HRV as raw events.
 * Writes with provider "manual", sourceId "oura" so existing normalization accepts them.
 * Auth: JWT required. Body: sleep[] and/or hrv[] with manual-compatible payloads.
 * Each item must include idempotencyKey (used as rawEvent doc id); duplicate keys are skipped.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../../middleware/auth";
import { userCollection } from "../../db";
import { writeFailure } from "../../lib/writeFailure";
import { logger } from "../../lib/logger";

const router = Router();
const OURA_SOURCE_ID = "oura";
const OURA_SOURCE_TYPE = "oura";

function getRequestId(req: Request): string {
  return (req as AuthedRequest).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

function dayUtcNow(): string {
  return new Date().toISOString().slice(0, 10);
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
  const rawEventsCol = userCollection(uid, "rawEvents");
  const receivedAt = new Date().toISOString();

  let eventsCreated = 0;
  let eventsAlreadyExists = 0;

  for (const item of sleep) {
    const payload = {
      start: item.start,
      end: item.end,
      timezone: item.timezone,
      ...(item.day != null ? { day: item.day } : {}),
      totalMinutes: item.totalMinutes,
      ...(item.efficiency != null ? { efficiency: item.efficiency } : {}),
      ...(item.latencyMinutes != null ? { latencyMinutes: item.latencyMinutes } : {}),
      ...(item.awakenings != null ? { awakenings: item.awakenings } : {}),
      isMainSleep: item.isMainSleep,
    };
    const doc = {
      id: item.idempotencyKey,
      userId: uid,
      sourceId: OURA_SOURCE_ID,
      sourceType: OURA_SOURCE_TYPE,
      provider: "manual" as const,
      kind: "sleep" as const,
      receivedAt,
      observedAt: item.start,
      payload,
      schemaVersion: 1 as const,
    };
    const validated = rawEventDocSchema.safeParse(doc);
    if (!validated.success) {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "oura.ingest.schema",
          reasonCode: "RAW_EVENT_SCHEMA_INVALID",
          message: "Invalid sleep RawEvent payload",
          day: item.day ?? dayUtcNow(),
          rawEventId: item.idempotencyKey,
          details: validated.error.flatten(),
          requestId,
        });
      } catch {
        // best-effort
      }
      continue;
    }
    try {
      await rawEventsCol.doc(item.idempotencyKey).create(validated.data);
      eventsCreated += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        eventsAlreadyExists += 1;
      } else {
        logger.error({
          msg: "oura_ingest_sleep_write_error",
          uid,
          rawEventId: item.idempotencyKey,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  for (const item of hrv) {
    const payload = {
      time: item.time,
      timezone: item.timezone,
      ...(item.day != null ? { day: item.day } : {}),
      ...(item.rmssdMs != null ? { rmssdMs: item.rmssdMs } : {}),
      ...(item.sdnnMs != null ? { sdnnMs: item.sdnnMs } : {}),
      ...(item.measurementType != null ? { measurementType: item.measurementType } : {}),
    };
    const doc = {
      id: item.idempotencyKey,
      userId: uid,
      sourceId: OURA_SOURCE_ID,
      sourceType: OURA_SOURCE_TYPE,
      provider: "manual" as const,
      kind: "hrv" as const,
      receivedAt,
      observedAt: item.time,
      payload,
      schemaVersion: 1 as const,
    };
    const validated = rawEventDocSchema.safeParse(doc);
    if (!validated.success) {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "oura.ingest.schema",
          reasonCode: "RAW_EVENT_SCHEMA_INVALID",
          message: "Invalid hrv RawEvent payload",
          day: item.day ?? dayUtcNow(),
          rawEventId: item.idempotencyKey,
          details: validated.error.flatten(),
          requestId,
        });
      } catch {
        // best-effort
      }
      continue;
    }
    try {
      await rawEventsCol.doc(item.idempotencyKey).create(validated.data);
      eventsCreated += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        eventsAlreadyExists += 1;
      } else {
        logger.error({
          msg: "oura_ingest_hrv_write_error",
          uid,
          rawEventId: item.idempotencyKey,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return res.status(200).json({
    ok: true as const,
    requestId,
    eventsCreated,
    eventsAlreadyExists,
  });
});

export default router;
