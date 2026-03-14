/**
 * Shared Oura raw-event write logic for POST /integrations/oura/ingest and POST /integrations/oura/pull-now.
 * Validates with rawEventDocSchema and writes to users/{uid}/rawEvents. No auth; caller must pass uid.
 */

import { rawEventDocSchema } from "@oli/contracts";
import type { OuraHrvIngestItem, OuraSleepIngestItem } from "./ouraApi";
import { userCollection } from "../db";
import { writeFailure } from "./writeFailure";
import { logger } from "./logger";

const OURA_SOURCE_ID = "oura";
const OURA_SOURCE_TYPE = "oura";

function dayUtcNow(): string {
  return new Date().toISOString().slice(0, 10);
}

export type WriteOuraRawEventsResult = {
  eventsCreated: number;
  eventsAlreadyExists: number;
};

/**
 * Write sleep and HRV items to rawEvents. Idempotent by doc id (idempotencyKey).
 * Returns counts; logs and writes FailureEntry on schema or write errors.
 */
export async function writeOuraRawEvents(
  uid: string,
  sleepItems: OuraSleepIngestItem[],
  hrvItems: OuraHrvIngestItem[],
  requestId: string,
): Promise<WriteOuraRawEventsResult> {
  const rawEventsCol = userCollection(uid, "rawEvents");
  const receivedAt = new Date().toISOString();
  let eventsCreated = 0;
  let eventsAlreadyExists = 0;

  for (const item of sleepItems) {
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

  for (const item of hrvItems) {
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

  return { eventsCreated, eventsAlreadyExists };
}
