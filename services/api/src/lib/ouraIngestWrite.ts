/**
 * Shared Oura raw-event write logic for POST /integrations/oura/ingest and POST /integrations/oura/pull-now.
 * Validates with rawEventDocSchema and writes to users/{uid}/rawEvents. No auth; caller must pass uid.
 */

import { rawEventDocSchema } from "@oli/contracts";
import type {
  OuraHrvIngestItem,
  OuraSleepIngestItem,
  OuraStepsIngestItem,
  OuraWorkoutIngestItem,
  OuraRawIngestItem,
} from "./ouraApi";
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

export type WriteOuraRawEventsOptions = {
  stepsItems?: OuraStepsIngestItem[];
  workoutItems?: OuraWorkoutIngestItem[];
  ouraRawItems?: OuraRawIngestItem[];
};

/**
 * Write sleep, HRV, and optional steps/workout/oura_raw items to rawEvents. Idempotent by doc id (idempotencyKey).
 * Core categories (sleep, hrv, steps, workout) are awaited so pull-now can complete and reach post-raw persistence.
 * ouraRawItems (vendor detail, e.g. session/tag/spo2/heartrate/personal) are deferred to a fire-and-forget loop
 * so large counts (e.g. 58k) do not block the request.
 */
export async function writeOuraRawEvents(
  uid: string,
  sleepItems: OuraSleepIngestItem[],
  hrvItems: OuraHrvIngestItem[],
  requestId: string,
  options: WriteOuraRawEventsOptions = {},
): Promise<WriteOuraRawEventsResult> {
  const { stepsItems = [], workoutItems = [], ouraRawItems = [] } = options;
  const rawEventsCol = userCollection(uid, "rawEvents");
  const receivedAt = new Date().toISOString();

  const [sleepRes, hrvRes, stepsRes, workoutRes] = await Promise.all([
    writeSleepLoop(rawEventsCol, sleepItems, receivedAt, uid, requestId),
    writeHrvLoop(rawEventsCol, hrvItems, receivedAt, uid, requestId),
    writeStepsLoop(rawEventsCol, stepsItems, receivedAt, uid, requestId),
    writeWorkoutLoop(rawEventsCol, workoutItems, receivedAt, uid, requestId),
  ]);

  const eventsCreated =
    sleepRes.created + hrvRes.created + stepsRes.created + workoutRes.created;
  const eventsAlreadyExists =
    sleepRes.alreadyExists +
    hrvRes.alreadyExists +
    stepsRes.alreadyExists +
    workoutRes.alreadyExists;

  logger.info({
    msg: "oura_raw_events_core_write_done",
    uid,
    requestId,
    sleepCreated: sleepRes.created,
    sleepAlreadyExists: sleepRes.alreadyExists,
    hrvCreated: hrvRes.created,
    hrvAlreadyExists: hrvRes.alreadyExists,
    stepsCreated: stepsRes.created,
    stepsAlreadyExists: stepsRes.alreadyExists,
    workoutCreated: workoutRes.created,
    workoutAlreadyExists: workoutRes.alreadyExists,
    eventsCreated,
    eventsAlreadyExists,
  });

  if (ouraRawItems.length > 0) {
    logger.info({
      msg: "oura_raw_events_vendor_detail_deferred",
      uid,
      requestId,
      ouraRawCount: ouraRawItems.length,
    });
    void writeOuraRawLoop(rawEventsCol, ouraRawItems, receivedAt, uid, requestId).catch(
      (err: unknown) => {
        logger.error({
          msg: "oura_raw_events_vendor_detail_deferred_error",
          uid,
          requestId,
          ouraRawCount: ouraRawItems.length,
          err: err instanceof Error ? err.message : String(err),
        });
      },
    );
  }

  return {
    eventsCreated,
    eventsAlreadyExists,
  };
}

type Col = ReturnType<typeof userCollection>;

async function writeSleepLoop(
  rawEventsCol: Col,
  sleepItems: OuraSleepIngestItem[],
  receivedAt: string,
  uid: string,
  requestId: string,
): Promise<{ created: number; alreadyExists: number }> {
  let created = 0;
  let alreadyExists = 0;
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
      created += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        alreadyExists += 1;
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
  return { created, alreadyExists };
}

async function writeHrvLoop(
  rawEventsCol: Col,
  hrvItems: OuraHrvIngestItem[],
  receivedAt: string,
  uid: string,
  requestId: string,
): Promise<{ created: number; alreadyExists: number }> {
  let created = 0;
  let alreadyExists = 0;
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
      created += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        alreadyExists += 1;
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
  return { created, alreadyExists };
}

async function writeStepsLoop(
  rawEventsCol: Col,
  stepsItems: OuraStepsIngestItem[],
  receivedAt: string,
  uid: string,
  requestId: string,
): Promise<{ created: number; alreadyExists: number }> {
  let created = 0;
  let alreadyExists = 0;
  for (const item of stepsItems) {
    const payload = {
      start: item.start,
      end: item.end,
      timezone: item.timezone,
      ...(item.day != null ? { day: item.day } : {}),
      steps: item.steps,
      ...(item.distanceKm != null ? { distanceKm: item.distanceKm } : {}),
      ...(item.moveMinutes != null ? { moveMinutes: item.moveMinutes } : {}),
    };
    const doc = {
      id: item.idempotencyKey,
      userId: uid,
      sourceId: OURA_SOURCE_ID,
      sourceType: OURA_SOURCE_TYPE,
      provider: "manual" as const,
      kind: "steps" as const,
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
          message: "Invalid steps RawEvent payload",
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
      created += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        alreadyExists += 1;
      } else {
        logger.error({
          msg: "oura_ingest_steps_write_error",
          uid,
          rawEventId: item.idempotencyKey,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return { created, alreadyExists };
}

async function writeWorkoutLoop(
  rawEventsCol: Col,
  workoutItems: OuraWorkoutIngestItem[],
  receivedAt: string,
  uid: string,
  requestId: string,
): Promise<{ created: number; alreadyExists: number }> {
  let created = 0;
  let alreadyExists = 0;
  for (const item of workoutItems) {
    const payload = {
      start: item.start,
      end: item.end,
      timezone: item.timezone,
      ...(item.day != null ? { day: item.day } : {}),
      sport: item.sport,
      durationMinutes: item.durationMinutes,
      ...(item.intensity != null ? { intensity: item.intensity } : {}),
      ...(item.trainingLoad != null ? { trainingLoad: item.trainingLoad } : {}),
    };
    const doc = {
      id: item.idempotencyKey,
      userId: uid,
      sourceId: OURA_SOURCE_ID,
      sourceType: OURA_SOURCE_TYPE,
      provider: "manual" as const,
      kind: "workout" as const,
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
          message: "Invalid workout RawEvent payload",
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
      created += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        alreadyExists += 1;
      } else {
        logger.error({
          msg: "oura_ingest_workout_write_error",
          uid,
          rawEventId: item.idempotencyKey,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return { created, alreadyExists };
}

async function writeOuraRawLoop(
  rawEventsCol: Col,
  ouraRawItems: OuraRawIngestItem[],
  receivedAt: string,
  uid: string,
  requestId: string,
): Promise<{ created: number; alreadyExists: number }> {
  let created = 0;
  let alreadyExists = 0;
  for (const item of ouraRawItems) {
    const payload = { dataset: item.dataset, data: item.data };
    const doc = {
      id: item.idempotencyKey,
      userId: uid,
      sourceId: OURA_SOURCE_ID,
      sourceType: OURA_SOURCE_TYPE,
      provider: "manual" as const,
      kind: "oura_raw" as const,
      receivedAt,
      observedAt: receivedAt,
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
          message: "Invalid oura_raw RawEvent payload",
          day: dayUtcNow(),
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
      created += 1;
    } catch (err: unknown) {
      const existing = await rawEventsCol.doc(item.idempotencyKey).get();
      if (existing.exists) {
        alreadyExists += 1;
      } else {
        logger.error({
          msg: "oura_ingest_oura_raw_write_error",
          uid,
          rawEventId: item.idempotencyKey,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return { created, alreadyExists };
}
