/**
 * POST /integrations/oura/pull-now — user-authenticated first-sync / pull from Oura API.
 * Fetches all supported Oura v2 datasets (sleep, readiness, activity, workout, session, tag, spo2, heartrate, personal),
 * maps to ingest shapes, writes raw events, updates lastSyncAt.
 * Requires Idempotency-Key; uses users/{uid}/requestRecords for replay-safe behavior.
 * Reuses writeOuraRawEvents (shared with POST /integrations/oura/ingest).
 */

import { Router, type Request, type Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { FieldValue, userCollection, ouraConnectedRegistryDoc } from "../../db";
import * as ouraSecrets from "../../lib/ouraSecrets";
import {
  refreshOuraAccessToken,
  fetchOuraSleep,
  fetchOuraDailyReadiness,
  fetchOuraPersonalInfo,
  fetchOuraDailyActivity,
  fetchOuraWorkouts,
  fetchOuraSessions,
  fetchOuraTags,
  fetchOuraSpo2,
  fetchOuraHeartrate,
  mapOuraSleepToIngestItem,
  mapOuraReadinessToHrvItem,
  mapOuraDailyActivityToStepsItem,
  mapOuraWorkoutToWorkoutItem,
  toOuraRawIngestItem,
  type OuraSleepIngestItem,
  type OuraHrvIngestItem,
  type OuraStepsIngestItem,
  type OuraWorkoutIngestItem,
  type OuraRawIngestItem,
  type OuraSleepDocument,
  type OuraDailyReadinessDocument,
  OuraApiError,
  ouraSleepWakeIsoForLog,
} from "../../lib/ouraApi";
import { writeOuraRawEvents } from "../../lib/ouraIngestWrite";
import {
  writeOuraVendorSleepSnapshots,
  writeOuraVendorReadinessSnapshots,
} from "../../lib/ouraVendorSnapshot";
import { deriveOuraSyncMetadataFields, isLegacyOuraIntegration } from "./ouraSyncMetadata";
import { writeFailure } from "../../lib/writeFailure";
import { logger } from "../../lib/logger";
import { publishOuraPostRawJob, getOuraPostRawTopic } from "../../lib/ouraPostRawJob";

const router = Router();

/** Pull last N days of data (sleep + readiness). */
const WINDOW_DAYS = 30;

/** Extra days before (today − WINDOW_DAYS) for sleep fetch only — idempotent refetch at rolling boundary. */
const PULL_SLEEP_START_OVERLAP_DAYS = 2;
/** Extend sleep `end_date` one UTC calendar day so wake-indexed rows land in range the same morning. */
const PULL_SLEEP_END_OVERLAP_DAYS = 1;

/** Backfill: total days to backfill and chunk size (idempotent, resumable). */
const BACKFILL_TOTAL_DAYS = 90;
const BACKFILL_CHUNK_DAYS = 30;

/** Return YYYY-MM-DD for (day - days). */
function dayMinus(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - days);
  return toYmd(d);
}

export type OuraPullNowResult = { statusCode: number; body: Record<string, unknown> };

function getRequestId(req: Request): string {
  return (req as AuthedRequest).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

function getIdempotencyKey(req: Request): string | undefined {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  return fromHeader?.trim() || undefined;
}

function toYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function performReconnectCleanupBestEffort(
  uid: string,
  requestId: string,
): Promise<void> {
  try {
    await ouraSecrets.deleteRefreshToken(uid);
    await userCollection(uid, "integrations").doc("oura").set(
      {
        connected: false,
        revoked: false,
        failureState: {
          code: "OURA_REFRESH_TOKEN_INVALID",
          message: "Oura connection expired. Please reconnect.",
          lastOccurredAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    await ouraConnectedRegistryDoc(uid).delete();
  } catch (cleanupErr) {
    const sanitized = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
    logger.error({
      msg: "oura_pull_now_reconnect_cleanup_error",
      uid,
      requestId,
      err: sanitized,
    });
  }
}

/**
 * Core Oura sync: refresh token → fetch sleep + HRV → write raw events → update lastSyncAt.
 * Used by POST /integrations/oura/pull-now and by callback after successful connect (fire-and-forget).
 */
export async function performOuraPullNowCore(
  uid: string,
  requestId: string,
): Promise<OuraPullNowResult> {
  const refreshToken = await ouraSecrets.getRefreshToken(uid);
  if (!refreshToken) {
    logger.error({ msg: "oura_pull_now_no_refresh_token", rid: requestId, uid });
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "oura.pullNow",
        reasonCode: "OURA_NOT_CONNECTED",
        message: "No Oura refresh token; connect Oura first",
        day: toYmd(new Date()),
        details: {},
        requestId,
      });
    } catch {
      // best-effort
    }
    return {
      statusCode: 502,
      body: {
        ok: false as const,
        error: {
          code: "OURA_NOT_CONNECTED" as const,
          message: "Oura not connected. Connect Oura in Settings first.",
          requestId,
        },
      },
    };
  }

  const clientId = process.env.OURA_CLIENT_ID?.trim();
  let clientSecret: string | null = null;
  try {
    clientSecret = await ouraSecrets.getClientSecret();
  } catch {
    // fall through
  }

  if (!clientId || !clientSecret) {
    logger.error({ msg: "oura_pull_now_misconfig", rid: requestId, hasClientId: !!clientId });
    return {
      statusCode: 500,
      body: {
        ok: false as const,
        error: {
          code: "SERVER_MISCONFIG" as const,
          message: "Oura OAuth not configured",
          requestId,
        },
      },
    };
  }

  let accessToken: string;
  try {
    const tokens = await refreshOuraAccessToken(refreshToken, clientId, clientSecret);
    accessToken = tokens.access_token;
    await ouraSecrets.setRefreshToken(uid, tokens.refresh_token);
  } catch (err) {
    const isUnauth = err instanceof OuraApiError && (err.status === 401 || err.code === "OURA_TOKEN_REFRESH_FAILED");
    if (isUnauth) {
      await performReconnectCleanupBestEffort(uid, requestId);
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "oura_pull_now_token_refresh_failed", rid: requestId, uid, err: message });
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "oura.pullNow",
        reasonCode: "OURA_TOKEN_REFRESH_FAILED",
        message,
        day: toYmd(new Date()),
        details: {},
        requestId,
      });
    } catch {
      // best-effort
    }
    return {
      statusCode: 502,
      body: {
        ok: false as const,
        error: {
          code: "OURA_FETCH_FAILED" as const,
          message: "Could not refresh Oura token. Try reconnecting Oura.",
          requestId,
        },
      },
    };
  }

  // Legacy recovery: connected users with no snapshot/backfill state get backfill started once.
  const integrationRef = userCollection(uid, "integrations").doc("oura");
  const integrationSnap = await integrationRef.get();
  const integrationData = integrationSnap.exists ? integrationSnap.data() : undefined;
  if (isLegacyOuraIntegration(integrationData)) {
    const backfillStatus = integrationData?.backfillStatus ?? null;
    if (backfillStatus === "running") {
      logger.info({
        msg: "oura_legacy_recovery_skipped_running",
        uid,
        requestId,
        connected: true,
        hasLastSnapshotAt: false,
        backfillStatus: "running",
      });
    } else {
      logger.info({
        msg: "oura_legacy_recovery_detected",
        uid,
        requestId,
        connected: true,
        hasLastSnapshotAt: false,
        backfillStatus,
      });
      try {
        await integrationRef.set(
          {
            backfillStatus: "running" as const,
            backfillStartedAt: FieldValue.serverTimestamp(),
            lastBackfillError: null,
          },
          { merge: true },
        );
      } catch (mergeErr) {
        logger.error({
          msg: "oura_legacy_recovery_metadata_error",
          uid,
          requestId,
          err: mergeErr instanceof Error ? mergeErr.message : String(mergeErr),
        });
      }
      logger.info({ msg: "oura_legacy_recovery_started", uid, requestId });
      void triggerOuraBackfill(uid, requestId).catch((err: unknown) =>
        logger.error({
          msg: "oura_legacy_recovery_backfill_error",
          uid,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - WINDOW_DAYS);
  const startStr = toYmd(startDate);
  const endStr = toYmd(endDate);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const sleepRangeEnd = new Date(endDate);
  sleepRangeEnd.setUTCDate(sleepRangeEnd.getUTCDate() + PULL_SLEEP_END_OVERLAP_DAYS);
  const sleepRangeStart = new Date(endDate);
  sleepRangeStart.setUTCDate(
    sleepRangeStart.getUTCDate() - WINDOW_DAYS - PULL_SLEEP_START_OVERLAP_DAYS,
  );
  const sleepStartStr = toYmd(sleepRangeStart);
  const sleepEndStr = toYmd(sleepRangeEnd);

  logger.info({
    msg: "oura_pull_sleep_date_window",
    uid,
    requestId,
    sleepStartStr,
    sleepEndStr,
    coreStartStr: startStr,
    coreEndStr: endStr,
    sleepStartOverlapDays: PULL_SLEEP_START_OVERLAP_DAYS,
    sleepEndOverlapDays: PULL_SLEEP_END_OVERLAP_DAYS,
  });

  let sleepItems: OuraSleepIngestItem[] = [];
  let hrvItems: OuraHrvIngestItem[] = [];
  let stepsItems: OuraStepsIngestItem[] = [];
  let workoutItems: OuraWorkoutIngestItem[] = [];
  const ouraRawItems: OuraRawIngestItem[] = [];
  let sleepDocs: Awaited<ReturnType<typeof fetchOuraSleep>> = [];
  let readinessDocs: Awaited<ReturnType<typeof fetchOuraDailyReadiness>> = [];

  const safeFetch = async <T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err instanceof OuraApiError ? err.code : "OURA_FETCH_FAILED";
      logger.info({ msg: "oura_pull_now_fetch_skipped", rid: requestId, uid, dataset: name, code, err: message });
      return null;
    }
  };

  try {
    const [
      sleepDocsFetched,
      readinessDocsFetched,
      personalDoc,
      dailyActivityDocs,
      workoutDocs,
      sessionDocs,
      tagDocs,
      spo2Docs,
      heartrateDocs,
    ] = await Promise.all([
      fetchOuraSleep(accessToken, sleepStartStr, sleepEndStr, { requestId, uid }),
      fetchOuraDailyReadiness(accessToken, startStr, endStr),
      safeFetch("personal_info", () => fetchOuraPersonalInfo(accessToken)),
      safeFetch("daily_activity", () => fetchOuraDailyActivity(accessToken, startStr, endStr)),
      safeFetch("workout", () => fetchOuraWorkouts(accessToken, startStr, endStr)),
      safeFetch("session", () => fetchOuraSessions(accessToken, startStr, endStr)),
      safeFetch("tag", () => fetchOuraTags(accessToken, startStr, endStr)),
      safeFetch("spo2", () => fetchOuraSpo2(accessToken, startStr, endStr)),
      safeFetch("heartrate", () => fetchOuraHeartrate(accessToken, startIso, endIso)),
    ]);

    sleepDocs = sleepDocsFetched ?? [];
    readinessDocs = readinessDocsFetched ?? [];

    let latestWakeIso: string | null = null;
    let latestSleepId: string | null = null;
    for (const d of sleepDocs) {
      const w = ouraSleepWakeIsoForLog(d);
      if (!w) continue;
      const t = Date.parse(w);
      if (Number.isNaN(t)) continue;
      if (!latestWakeIso || t > Date.parse(latestWakeIso)) {
        latestWakeIso = w;
        latestSleepId = typeof d.id === "string" ? d.id : null;
      }
    }
    logger.info({
      msg: "oura_pull_sleep_latest_wake",
      uid,
      requestId,
      latestWakeIso,
      latestSleepId,
      sleepDocCount: sleepDocs.length,
    });

    logger.info({
      msg: "oura_fetch_counts",
      uid,
      requestId,
      sleepDocCount: sleepDocs.length,
      readinessDocCount: readinessDocs.length,
    });
    sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter((x): x is OuraSleepIngestItem => x !== null);
    hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter((x): x is OuraHrvIngestItem => x !== null);
    const sleepDropped = sleepDocs.length - sleepItems.length;
    if (sleepDropped > 0) {
      const firstDoc = sleepDocs[0];
      const sampleKeys = firstDoc && typeof firstDoc === "object" ? Object.keys(firstDoc).slice(0, 20) : [];
      logger.info({
        msg: "oura_sleep_docs_dropped",
        uid,
        requestId,
        sleepDocCount: sleepDocs.length,
        sleepItemCount: sleepItems.length,
        sleepDroppedCount: sleepDropped,
        sampleKeys,
      });
    }
    logger.info({
      msg: "oura_ingest_item_counts",
      uid,
      requestId,
      sleepItemCount: sleepItems.length,
      hrvItemCount: hrvItems.length,
    });
    stepsItems = (dailyActivityDocs ?? [])
      .map(mapOuraDailyActivityToStepsItem)
      .filter((x): x is OuraStepsIngestItem => x !== null);
    workoutItems = (workoutDocs ?? [])
      .map(mapOuraWorkoutToWorkoutItem)
      .filter((x): x is OuraWorkoutIngestItem => x !== null);

    if (personalDoc && typeof personalDoc === "object") {
      ouraRawItems.push(
        toOuraRawIngestItem("personal", `oura_personal_${uid}`, personalDoc as Record<string, unknown>),
      );
    }
    (sessionDocs ?? []).forEach((doc, i) => {
      const id = (doc as { id?: string }).id ?? `oura_session_${startStr}_${i}`;
      ouraRawItems.push(toOuraRawIngestItem("session", id, doc as Record<string, unknown>));
    });
    (tagDocs ?? []).forEach((doc, i) => {
      const id = (doc as { id?: string }).id ?? `oura_tag_${startStr}_${i}`;
      ouraRawItems.push(toOuraRawIngestItem("tag", id, doc as Record<string, unknown>));
    });
    (spo2Docs ?? []).forEach((doc, i) => {
      const d = doc as { id?: string; day?: string };
      const id = d.id ?? d.day ?? `oura_spo2_${startStr}_${i}`;
      ouraRawItems.push(toOuraRawIngestItem("spo2", String(id), doc as Record<string, unknown>));
    });
    (heartrateDocs ?? []).forEach((doc, i) => {
      const id = (doc as { id?: string }).id ?? `oura_heartrate_${startStr}_${i}`;
      ouraRawItems.push(toOuraRawIngestItem("heartrate", id, doc as Record<string, unknown>));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err instanceof OuraApiError ? err.code : "OURA_FETCH_FAILED";
    logger.error({ msg: "oura_pull_now_fetch_failed", rid: requestId, uid, code, err: message });
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "oura.pullNow",
        reasonCode: code,
        message,
        day: toYmd(new Date()),
        details: {},
        requestId,
      });
    } catch {
      // best-effort
    }
    return {
      statusCode: 502,
      body: {
        ok: false as const,
        error: {
          code: "OURA_FETCH_FAILED" as const,
          message: "Failed to fetch Oura data",
          requestId,
        },
      },
    };
  }

  logger.info({
    msg: "oura_raw_events_write_start",
    uid,
    requestId,
    sleepCount: sleepItems.length,
    hrvCount: hrvItems.length,
    stepsCount: stepsItems.length,
    workoutCount: workoutItems.length,
    ouraRawCount: ouraRawItems.length,
  });
  const { eventsCreated, eventsAlreadyExists } = await writeOuraRawEvents(
    uid,
    sleepItems,
    hrvItems,
    requestId,
    { stepsItems, workoutItems, ouraRawItems },
  );
  logger.info({
    msg: "oura_raw_events_write_done",
    uid,
    requestId,
    eventsCreated,
    eventsAlreadyExists,
  });

  const sleepDocsToUse = sleepDocs ?? [];
  const readinessDocsToUse = readinessDocs ?? [];

  if (getOuraPostRawTopic()) {
    try {
      const messageId = await publishOuraPostRawJob(
        uid,
        requestId,
        sleepDocsToUse,
        readinessDocsToUse,
      );
      logger.info({
        msg: "oura_post_raw_job_enqueued",
        uid,
        requestId,
        messageId: messageId ?? undefined,
        sleepDocCount: sleepDocsToUse.length,
        readinessDocCount: readinessDocsToUse.length,
      });
    } catch (err) {
      logger.error({
        msg: "oura_post_raw_job_enqueue_error",
        uid,
        requestId,
        err: err instanceof Error ? err.message : String(err),
      });
      void performOuraPostRawPersistence(uid, requestId, sleepDocsToUse, readinessDocsToUse).catch(
        (fallbackErr: unknown) => {
          logger.error({
            msg: "oura_post_raw_persistence_error",
            uid,
            requestId,
            err: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          });
        },
      );
    }
  } else {
    void performOuraPostRawPersistence(uid, requestId, sleepDocsToUse, readinessDocsToUse).catch(
      (err: unknown) => {
        logger.error({
          msg: "oura_post_raw_persistence_error",
          uid,
          requestId,
          err: err instanceof Error ? err.message : String(err),
        });
      },
    );
  }

  return {
    statusCode: 202,
    body: {
      ok: true as const,
      requestId,
      windowDays: WINDOW_DAYS,
      eventsCreated,
      eventsAlreadyExists,
    },
  };
}

/**
 * Post-raw persistence: write vendor sleep/readiness snapshots and integration metadata.
 * Only set lastSyncAt / lastSnapshotAt when at least one snapshot doc was written.
 * Set lastRefreshAt when this phase completes successfully enough to write metadata.
 * Called fire-and-forget after raw events are written; errors are logged by the caller.
 */
export async function performOuraPostRawPersistence(
  uid: string,
  requestId: string,
  sleepDocs: OuraSleepDocument[],
  readinessDocs: OuraDailyReadinessDocument[],
): Promise<void> {
  logger.info({
    msg: "oura_post_raw_persistence_started",
    uid,
    requestId,
    sleepDocCount: sleepDocs.length,
    readinessDocCount: readinessDocs.length,
  });

  let sleepResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  let readinessResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  try {
    const [sleepRes, readinessRes] = await Promise.all([
      writeOuraVendorSleepSnapshots(uid, sleepDocs, requestId),
      writeOuraVendorReadinessSnapshots(uid, readinessDocs, requestId),
    ]);
    sleepResult = sleepRes;
    readinessResult = readinessRes;
  } catch (snapErr) {
    logger.error({
      msg: "oura_post_raw_persistence_error",
      uid,
      requestId,
      sleepWritten: 0,
      readinessWritten: 0,
      metadataWritten: false,
      err: snapErr instanceof Error ? snapErr.message : String(snapErr),
    });
    return;
  }

  const totalSnapshotWritten = sleepResult.written + readinessResult.written;
  const meta = deriveOuraSyncMetadataFields(totalSnapshotWritten);

  let metadataWritten = false;
  try {
    const integrationRef = userCollection(uid, "integrations").doc("oura");
    const update: Record<string, unknown> = {
      lastRefreshAt: FieldValue.serverTimestamp(),
    };
    if (meta.setLastSyncAt) {
      update.lastSyncAt = FieldValue.serverTimestamp();
    }
    if (meta.setLastSnapshotAt) {
      update.lastSnapshotAt = FieldValue.serverTimestamp();
    }
    await integrationRef.set(update, { merge: true });
    metadataWritten = true;
  } catch (metaErr) {
    logger.error({
      msg: "oura_post_raw_persistence_error",
      uid,
      requestId,
      sleepWritten: sleepResult.written,
      readinessWritten: readinessResult.written,
      metadataWritten: false,
      err: metaErr instanceof Error ? metaErr.message : String(metaErr),
    });
    return;
  }

  logger.info({
    msg: "oura_post_raw_persistence_done",
    uid,
    requestId,
    sleepWritten: sleepResult.written,
    readinessWritten: readinessResult.written,
    metadataWritten,
  });
}

/** Backfill status persisted on users/{uid}/integrations/oura. */
export type OuraBackfillStatus = "idle" | "running" | "completed" | "failed";

/**
 * Backfill Oura sleep + readiness (canonical + vendor snapshots) for the last BACKFILL_TOTAL_DAYS.
 * Chunked, idempotent. Persists backfill lifecycle to integration doc: running → completed | failed.
 */
export async function triggerOuraBackfill(uid: string, requestId: string): Promise<void> {
  const integrationRef = userCollection(uid, "integrations").doc("oura");

  const setBackfillRunning = async (): Promise<void> => {
    await integrationRef.set(
      {
        backfillStatus: "running" as const,
        backfillStartedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  };

  const setBackfillFailed = async (err: string): Promise<void> => {
    await integrationRef.set(
      {
        backfillStatus: "failed" as const,
        backfillFailedAt: FieldValue.serverTimestamp(),
        lastBackfillError: err,
      },
      { merge: true },
    );
  };

  const setBackfillCompleted = async (): Promise<void> => {
    await integrationRef.set(
      {
        backfillStatus: "completed" as const,
        backfillCompletedAt: FieldValue.serverTimestamp(),
        lastBackfillError: null,
      },
      { merge: true },
    );
  };

  const refreshToken = await ouraSecrets.getRefreshToken(uid);
  if (!refreshToken) {
    logger.info({ msg: "oura_backfill_skipped_no_token", uid, requestId });
    return;
  }

  const clientId = process.env.OURA_CLIENT_ID?.trim();
  let clientSecret: string | null = null;
  try {
    clientSecret = await ouraSecrets.getClientSecret();
  } catch {
    // fall through
  }
  if (!clientId || !clientSecret) {
    logger.info({ msg: "oura_backfill_skipped_misconfig", uid, requestId });
    return;
  }

  let accessToken: string;
  try {
    const tokens = await refreshOuraAccessToken(refreshToken, clientId, clientSecret);
    accessToken = tokens.access_token;
    await ouraSecrets.setRefreshToken(uid, tokens.refresh_token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.info({ msg: "oura_backfill_token_failed", uid, requestId, err: message });
    try {
      await setBackfillRunning();
      await setBackfillFailed(message);
    } catch {
      // best-effort
    }
    logger.info({ msg: "oura_backfill_failed", uid, requestId, err: message });
    return;
  }

  try {
    await setBackfillRunning();
  } catch (mergeErr) {
    logger.error({
      msg: "oura_backfill_start_metadata_error",
      uid,
      requestId,
      err: mergeErr instanceof Error ? mergeErr.message : String(mergeErr),
    });
  }
  logger.info({ msg: "oura_backfill_started", uid, requestId });

  const today = toYmd(new Date());
  let totalSleepWritten = 0;
  let totalReadinessWritten = 0;
  let lastChunkError: string | null = null;

  for (let offsetEnd = BACKFILL_TOTAL_DAYS; offsetEnd > 0; offsetEnd -= BACKFILL_CHUNK_DAYS) {
    const offsetStart = Math.max(0, offsetEnd - BACKFILL_CHUNK_DAYS);
    const startStr = dayMinus(today, offsetEnd);
    const endStr = dayMinus(today, offsetStart);

    try {
      const [sleepDocsFetched, readinessDocsFetched] = await Promise.all([
        fetchOuraSleep(accessToken, startStr, endStr, { requestId, uid }),
        fetchOuraDailyReadiness(accessToken, startStr, endStr),
      ]);
      const sleepDocs = sleepDocsFetched ?? [];
      const readinessDocs = readinessDocsFetched ?? [];
      const sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter((x): x is OuraSleepIngestItem => x !== null);
      const hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter((x): x is OuraHrvIngestItem => x !== null);

      await writeOuraRawEvents(uid, sleepItems, hrvItems, requestId, {});
      const [sleepRes, readinessRes] = await Promise.all([
        writeOuraVendorSleepSnapshots(uid, sleepDocs, requestId),
        writeOuraVendorReadinessSnapshots(uid, readinessDocs, requestId),
      ]);
      totalSleepWritten += sleepRes.written;
      totalReadinessWritten += readinessRes.written;
      logger.info({
        msg: "oura_backfill_chunk_done",
        uid,
        requestId,
        startStr,
        endStr,
        sleepWritten: sleepRes.written,
        readinessWritten: readinessRes.written,
      });
    } catch (chunkErr) {
      const message = chunkErr instanceof Error ? chunkErr.message : String(chunkErr);
      lastChunkError = message;
      logger.info({
        msg: "oura_backfill_chunk_error",
        uid,
        requestId,
        startStr,
        endStr,
        err: message,
      });
    }
  }

  const anyWritten = totalSleepWritten + totalReadinessWritten > 0;
  try {
    if (anyWritten) {
      await setBackfillCompleted();
      logger.info({
        msg: "oura_backfill_completed",
        uid,
        requestId,
        sleepSnapshotsWritten: totalSleepWritten,
        readinessSnapshotsWritten: totalReadinessWritten,
      });
    } else {
      const errMsg = lastChunkError ?? "No data imported";
      await setBackfillFailed(errMsg);
      logger.info({ msg: "oura_backfill_failed", uid, requestId, err: errMsg });
    }
  } catch (metaErr) {
    logger.error({
      msg: "oura_backfill_finish_metadata_error",
      uid,
      requestId,
      err: metaErr instanceof Error ? metaErr.message : String(metaErr),
    });
  }
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
        message: "Idempotency-Key header is required for pull-now",
        requestId,
      },
    });
  }

  const recordRef = userCollection(uid, "requestRecords").doc(idempotencyKey);

  try {
    await recordRef.create({
      kind: "oura.pullNow",
      windowDays: WINDOW_DAYS,
      status: "in_progress",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (createErr: unknown) {
    const isAlreadyExists =
      createErr &&
      typeof createErr === "object" &&
      "code" in createErr &&
      (createErr as { code?: number }).code === 6;

    if (!isAlreadyExists) throw createErr;

    const existing = await recordRef.get();
    const data = existing.exists ? existing.data() : undefined;
    const status = data?.status;
    const statusCode = data?.statusCode as number | undefined;
    const result = data?.result as Record<string, unknown> | undefined;

    if (status === "complete" && typeof statusCode === "number" && result && typeof result === "object") {
      const body = { ...result, requestId } as Record<string, unknown>;
      if (body.error && typeof body.error === "object" && body.error !== null) {
        body.error = { ...(body.error as Record<string, unknown>), requestId };
      }
      return res.status(statusCode).json(body);
    }

    return res.status(409).json({
      ok: false as const,
      error: {
        code: "CONFLICT" as const,
        message: "Request already in progress",
        requestId,
      },
    });
  }

  const result = await performOuraPullNowCore(uid, requestId);
  await recordRef.set(
    {
      status: "complete",
      statusCode: result.statusCode,
      result: result.body,
      completedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return res.status(result.statusCode).json(result.body);
});

export default router;
