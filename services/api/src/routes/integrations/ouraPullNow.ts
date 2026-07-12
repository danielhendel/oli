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
  fetchOuraSleep,
  fetchOuraDailyReadiness,
  fetchOuraDailySleep,
  fetchOuraDailyStress,
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
  type OuraDailySleepDocument,
  type OuraDailyStressDocument,
  OuraApiError,
  resolveOuraSleepIngestBase,
} from "../../lib/ouraApi";
import { writeOuraRawEvents } from "../../lib/ouraIngestWrite";
import {
  writeOuraVendorSleepSnapshots,
  writeOuraVendorReadinessSnapshots,
  writeOuraVendorStressSnapshots,
} from "../../lib/ouraVendorSnapshot";
import { deriveOuraSyncMetadataFields, isLegacyOuraIntegration } from "./ouraSyncMetadata";
import { writeFailure } from "../../lib/writeFailure";
import {
  categorizeOuraSafeError,
  logOuraRefreshTelemetry,
  type OuraSafeErrorCode,
} from "../../lib/ouraRefreshTelemetry";
import { publishOuraPostRawJob, getOuraPostRawTopic } from "../../lib/ouraPostRawJob";
import { refreshOuraTokenSingleFlight } from "../../lib/ouraTokenRefreshSingleFlight";

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
    logOuraRefreshTelemetry({
      operation: "oura_reconnect_cleanup_failed",
      requestId,
      safeErrorCode: categorizeOuraSafeError(cleanupErr).safeErrorCode,
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
    logOuraRefreshTelemetry({
      operation: "oura_pull_failed",
      requestId,
      safeErrorCode: "NO_CONNECTION",
      retryable: false,
    });
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
    logOuraRefreshTelemetry({
      operation: "oura_pull_failed",
      requestId,
      safeErrorCode: "TOKEN_UNAVAILABLE",
      retryable: false,
    });
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
    const outcome = await refreshOuraTokenSingleFlight({
      uid,
      requestId,
      clientId,
      clientSecret,
      performReconnectCleanup: performReconnectCleanupBestEffort,
    });

    if (outcome.kind === "refreshed") {
      accessToken = outcome.tokens.access_token;
    } else if (outcome.kind === "no_refresh_token") {
      logOuraRefreshTelemetry({
        operation: "oura_pull_failed",
        requestId,
        safeErrorCode: "NO_CONNECTION",
        retryable: false,
      });
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
    } else if (outcome.kind === "lock_unavailable") {
      logOuraRefreshTelemetry({
        operation: "oura_token_refresh_busy",
        requestId,
        retryable: true,
      });
      return {
        statusCode: 503,
        body: {
          ok: false as const,
          error: {
            code: "OURA_TOKEN_REFRESH_BUSY" as const,
            message: "Another Oura sync is currently refreshing the token. Retry shortly.",
            requestId,
          },
        },
      };
    } else {
      logOuraRefreshTelemetry({
        operation: "oura_pull_failed",
        requestId,
        safeErrorCode: "PROVIDER_UNAUTHORIZED",
        retryable: false,
        cleanedUp: outcome.cleanedUp,
      });
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "oura.pullNow",
          reasonCode: "OURA_TOKEN_REFRESH_FAILED",
          message: "Oura refresh token rejected (invalid_grant)",
          day: toYmd(new Date()),
          details: { cleanedUp: outcome.cleanedUp },
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logOuraRefreshTelemetry({
      operation: "oura_pull_failed",
      requestId,
      ...categorizeOuraSafeError(err, "PROVIDER_UNAUTHORIZED"),
    });
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
      logOuraRefreshTelemetry({
        operation: "oura_legacy_recovery_skipped",
        requestId,
        backfillStatus: "running",
      });
    } else {
      logOuraRefreshTelemetry({
        operation: "oura_legacy_recovery_detected",
        requestId,
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
        logOuraRefreshTelemetry({
          operation: "oura_legacy_recovery_failed",
          requestId,
          safeErrorCode: categorizeOuraSafeError(mergeErr).safeErrorCode,
        });
      }
      logOuraRefreshTelemetry({ operation: "oura_legacy_recovery_started", requestId });
      void triggerOuraBackfill(uid, requestId).catch((err: unknown) =>
        logOuraRefreshTelemetry({
          operation: "oura_legacy_recovery_failed",
          requestId,
          safeErrorCode: categorizeOuraSafeError(err).safeErrorCode,
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

  logOuraRefreshTelemetry({
    operation: "oura_pull_window",
    requestId,
    windowDayCount: WINDOW_DAYS,
    sleepStartOverlapDayCount: PULL_SLEEP_START_OVERLAP_DAYS,
    sleepEndOverlapDayCount: PULL_SLEEP_END_OVERLAP_DAYS,
  });

  let sleepItems: OuraSleepIngestItem[] = [];
  let hrvItems: OuraHrvIngestItem[] = [];
  let stepsItems: OuraStepsIngestItem[] = [];
  let workoutItems: OuraWorkoutIngestItem[] = [];
  const ouraRawItems: OuraRawIngestItem[] = [];
  let sleepDocs: Awaited<ReturnType<typeof fetchOuraSleep>> = [];
  let readinessDocs: Awaited<ReturnType<typeof fetchOuraDailyReadiness>> = [];
  let dailySleepDocs: OuraDailySleepDocument[] = [];
  let dailyStressDocs: OuraDailyStressDocument[] = [];

  const safeFetch = async <T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      logOuraRefreshTelemetry({
        operation: "oura_provider_fetch_skipped",
        requestId,
        dataset: name,
        safeErrorCode: categorizeOuraSafeError(err).safeErrorCode,
      });
      return null;
    }
  };

  try {
    const [
      sleepDocsFetched,
      readinessDocsFetched,
      dailySleepDocsFetched,
      dailyStressDocsFetched,
      personalDoc,
      dailyActivityDocs,
      workoutDocs,
      sessionDocs,
      tagDocs,
      spo2Docs,
      heartrateDocs,
    ] = await Promise.all([
      fetchOuraSleep(accessToken, sleepStartStr, sleepEndStr, { requestId, uid }),
      /** Same inclusive window as sleep so readiness/HRV rows near rolling boundaries are not dropped. */
      fetchOuraDailyReadiness(accessToken, sleepStartStr, sleepEndStr),
      /** Calendar-day Sleep Score + contributors (distinct from period `/sleep` docs). */
      fetchOuraDailySleep(accessToken, sleepStartStr, sleepEndStr),
      /** Calendar-day Daily Stress summaries (same window as other daily collections). */
      fetchOuraDailyStress(accessToken, sleepStartStr, sleepEndStr, { requestId }),
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
    dailySleepDocs = dailySleepDocsFetched ?? [];
    dailyStressDocs = dailyStressDocsFetched ?? [];

    logOuraRefreshTelemetry({
      operation: "oura_pull_sleep_summary",
      requestId,
      hasSleepDocuments: sleepDocs.length > 0,
      sleepDocumentCount: sleepDocs.length,
    });

    logOuraRefreshTelemetry({
      operation: "oura_pull_fetch_completed",
      requestId,
      sleepDocumentCount: sleepDocs.length,
      readinessDocumentCount: readinessDocs.length,
    });
    sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter((x): x is OuraSleepIngestItem => x !== null);
    hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter((x): x is OuraHrvIngestItem => x !== null);
    const sleepDropped = sleepDocs.length - sleepItems.length;
    if (sleepDropped > 0) {
      logOuraRefreshTelemetry({
        operation: "oura_ingest_docs_dropped",
        requestId,
        sleepDocumentCount: sleepDocs.length,
        rejectedItemCount: sleepDropped,
      });
    }
    logOuraRefreshTelemetry({
      operation: "oura_ingest_item_counts",
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
    for (const doc of sleepDocs) {
      const id =
        typeof doc.id === "string" && doc.id.trim().length > 0
          ? doc.id.trim()
          : (() => {
              const r = resolveOuraSleepIngestBase(doc);
              return r ? `oura_sleep_${r.start}` : null;
            })();
      if (id) {
        ouraRawItems.push(toOuraRawIngestItem("sleep", id, doc as Record<string, unknown>));
      }
    }
    for (const doc of dailySleepDocs) {
      const day =
        typeof doc.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(doc.day.trim())
          ? doc.day.trim()
          : null;
      const id =
        typeof doc.id === "string" && doc.id.trim().length > 0
          ? doc.id.trim()
          : day != null
            ? `oura_daily_sleep_${day}`
            : null;
      if (id) {
        ouraRawItems.push(toOuraRawIngestItem("daily_sleep", id, doc as Record<string, unknown>));
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err instanceof OuraApiError ? err.code : "OURA_FETCH_FAILED";
    logOuraRefreshTelemetry({
      operation: "oura_pull_failed",
      requestId,
      ...categorizeOuraSafeError(err),
    });
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

  logOuraRefreshTelemetry({
    operation: "oura_raw_event_persist_started",
    requestId,
    sleepItemCount: sleepItems.length,
    hrvItemCount: hrvItems.length,
    stepsItemCount: stepsItems.length,
    workoutItemCount: workoutItems.length,
    rawItemCount: ouraRawItems.length,
  });
  const { eventsCreated, eventsAlreadyExists } = await writeOuraRawEvents(
    uid,
    sleepItems,
    hrvItems,
    requestId,
    { stepsItems, workoutItems, ouraRawItems },
  );
  logOuraRefreshTelemetry({
    operation: "oura_raw_event_persist_completed",
    requestId,
    rawEventCreatedCount: eventsCreated,
    rawEventExistingCount: eventsAlreadyExists,
  });

  const sleepDocsToUse = sleepDocs ?? [];
  const readinessDocsToUse = readinessDocs ?? [];
  const dailySleepDocsToUse = dailySleepDocs ?? [];
  const dailyStressDocsToUse = dailyStressDocs ?? [];

  if (getOuraPostRawTopic()) {
    try {
      await publishOuraPostRawJob(
        uid,
        requestId,
        sleepDocsToUse,
        readinessDocsToUse,
        dailySleepDocsToUse,
        dailyStressDocsToUse,
      );
      logOuraRefreshTelemetry({
        operation: "oura_post_raw_enqueued",
        requestId,
        queued: true,
        sleepDocumentCount: sleepDocsToUse.length,
        readinessDocumentCount: readinessDocsToUse.length,
        dailySleepDocumentCount: dailySleepDocsToUse.length,
        dailyStressDocumentCount: dailyStressDocsToUse.length,
      });
      void performOuraPostRawPersistence(
        uid,
        requestId,
        sleepDocsToUse,
        readinessDocsToUse,
        dailySleepDocsToUse,
        dailyStressDocsToUse,
      ).catch((persistErr: unknown) => {
          logOuraRefreshTelemetry({
            operation: "oura_post_raw_persist_failed",
            requestId,
            safeErrorCode: categorizeOuraSafeError(persistErr, "POST_RAW_PERSIST_FAILED").safeErrorCode,
            metadataWritten: false,
          });
        },
      );
    } catch (err) {
      logOuraRefreshTelemetry({
        operation: "oura_post_raw_enqueue_failed",
        requestId,
        safeErrorCode: categorizeOuraSafeError(err, "POST_RAW_PUBLISH_FAILED").safeErrorCode,
      });
      void performOuraPostRawPersistence(
        uid,
        requestId,
        sleepDocsToUse,
        readinessDocsToUse,
        dailySleepDocsToUse,
        dailyStressDocsToUse,
      ).catch((fallbackErr: unknown) => {
          logOuraRefreshTelemetry({
            operation: "oura_post_raw_persist_failed",
            requestId,
            safeErrorCode: categorizeOuraSafeError(fallbackErr, "POST_RAW_PERSIST_FAILED").safeErrorCode,
            metadataWritten: false,
          });
        },
      );
    }
  } else {
    void performOuraPostRawPersistence(
      uid,
      requestId,
      sleepDocsToUse,
      readinessDocsToUse,
      dailySleepDocsToUse,
      dailyStressDocsToUse,
    ).catch((err: unknown) => {
      logOuraRefreshTelemetry({
        operation: "oura_post_raw_persist_failed",
        requestId,
        safeErrorCode: categorizeOuraSafeError(err, "POST_RAW_PERSIST_FAILED").safeErrorCode,
        metadataWritten: false,
      });
    });
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
  dailySleepDocs: OuraDailySleepDocument[] = [],
  dailyStressDocs: OuraDailyStressDocument[] = [],
): Promise<void> {
  logOuraRefreshTelemetry({
    operation: "oura_post_raw_persist_started",
    requestId,
    sleepDocumentCount: sleepDocs.length,
    readinessDocumentCount: readinessDocs.length,
    dailySleepDocumentCount: dailySleepDocs.length,
    dailyStressDocumentCount: dailyStressDocs.length,
  });

  let sleepResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  let readinessResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  let stressResult = { attempted: 0, written: 0, skippedMissingDay: 0, errors: 0 };
  try {
    const [sleepRes, readinessRes, stressRes] = await Promise.all([
      writeOuraVendorSleepSnapshots(uid, sleepDocs, requestId, readinessDocs, dailySleepDocs),
      writeOuraVendorReadinessSnapshots(uid, readinessDocs, requestId),
      writeOuraVendorStressSnapshots(uid, dailyStressDocs, requestId),
    ]);
    sleepResult = sleepRes;
    readinessResult = readinessRes;
    stressResult = stressRes;
  } catch (snapErr) {
    logOuraRefreshTelemetry({
      operation: "oura_post_raw_persist_failed",
      requestId,
      safeErrorCode: categorizeOuraSafeError(snapErr, "POST_RAW_PERSIST_FAILED").safeErrorCode,
      metadataWritten: false,
    });
    return;
  }

  const totalSnapshotWritten = sleepResult.written + readinessResult.written + stressResult.written;
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
    logOuraRefreshTelemetry({
      operation: "oura_post_raw_persist_failed",
      requestId,
      safeErrorCode: categorizeOuraSafeError(metaErr, "POST_RAW_PERSIST_FAILED").safeErrorCode,
      metadataWritten: false,
    });
    return;
  }

  logOuraRefreshTelemetry({
    operation: "oura_post_raw_persist_completed",
    requestId,
    writtenCount: totalSnapshotWritten,
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
    logOuraRefreshTelemetry({ operation: "oura_backfill_skipped", requestId, safeErrorCode: "NO_CONNECTION" });
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
    logOuraRefreshTelemetry({ operation: "oura_backfill_skipped", requestId, safeErrorCode: "TOKEN_UNAVAILABLE" });
    return;
  }

  let accessToken: string;
  try {
    const outcome = await refreshOuraTokenSingleFlight({
      uid,
      requestId,
      clientId,
      clientSecret,
      performReconnectCleanup: performReconnectCleanupBestEffort,
    });
    if (outcome.kind === "refreshed") {
      accessToken = outcome.tokens.access_token;
    } else {
      const message =
        outcome.kind === "lock_unavailable"
          ? `lock_unavailable_waited_${outcome.waitedMs}ms`
          : outcome.kind === "no_refresh_token"
            ? "no_refresh_token"
            : `invalid_grant_cleanup=${outcome.cleanedUp}`;
      const safeErrorCode: OuraSafeErrorCode =
        outcome.kind === "lock_unavailable"
          ? "PROVIDER_TIMEOUT"
          : outcome.kind === "no_refresh_token"
            ? "NO_CONNECTION"
            : "PROVIDER_UNAUTHORIZED";
      try {
        await setBackfillRunning();
        await setBackfillFailed(message);
      } catch {
        // best-effort
      }
      logOuraRefreshTelemetry({ operation: "oura_backfill_failed", requestId, safeErrorCode });
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const { safeErrorCode } = categorizeOuraSafeError(err, "PROVIDER_UNAUTHORIZED");
    try {
      await setBackfillRunning();
      await setBackfillFailed(message);
    } catch {
      // best-effort
    }
    logOuraRefreshTelemetry({ operation: "oura_backfill_failed", requestId, safeErrorCode });
    return;
  }

  try {
    await setBackfillRunning();
  } catch (mergeErr) {
    logOuraRefreshTelemetry({
      operation: "oura_backfill_failed",
      requestId,
      safeErrorCode: categorizeOuraSafeError(mergeErr).safeErrorCode,
    });
  }
  logOuraRefreshTelemetry({ operation: "oura_backfill_started", requestId });

  const today = toYmd(new Date());
  let totalSleepWritten = 0;
  let totalReadinessWritten = 0;
  let lastChunkError: string | null = null;
  let lastChunkSafeErrorCode: OuraSafeErrorCode | null = null;
  const chunkCount = Math.ceil(BACKFILL_TOTAL_DAYS / BACKFILL_CHUNK_DAYS);
  let chunkIndex = 0;

  for (let offsetEnd = BACKFILL_TOTAL_DAYS; offsetEnd > 0; offsetEnd -= BACKFILL_CHUNK_DAYS) {
    const offsetStart = Math.max(0, offsetEnd - BACKFILL_CHUNK_DAYS);
    const chunkDayCount = offsetEnd - offsetStart;
    const startStr = dayMinus(today, offsetEnd);
    const endStr = dayMinus(today, offsetStart);

    try {
      const [sleepDocsFetched, readinessDocsFetched, dailySleepDocsFetched] = await Promise.all([
        fetchOuraSleep(accessToken, startStr, endStr, { requestId, uid }),
        fetchOuraDailyReadiness(accessToken, startStr, endStr),
        fetchOuraDailySleep(accessToken, startStr, endStr),
      ]);
      const sleepDocs = sleepDocsFetched ?? [];
      const readinessDocs = readinessDocsFetched ?? [];
      const dailySleepDocsChunk = dailySleepDocsFetched ?? [];
      const sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter((x): x is OuraSleepIngestItem => x !== null);
      const hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter((x): x is OuraHrvIngestItem => x !== null);

      await writeOuraRawEvents(uid, sleepItems, hrvItems, requestId, {});
      const [sleepRes, readinessRes] = await Promise.all([
        writeOuraVendorSleepSnapshots(uid, sleepDocs, requestId, readinessDocs, dailySleepDocsChunk),
        writeOuraVendorReadinessSnapshots(uid, readinessDocs, requestId),
      ]);
      totalSleepWritten += sleepRes.written;
      totalReadinessWritten += readinessRes.written;
      logOuraRefreshTelemetry({
        operation: "oura_backfill_chunk_completed",
        requestId,
        chunkIndex,
        chunkCount,
        chunkDayCount,
        sleepSnapshotWrittenCount: sleepRes.written,
        readinessSnapshotWrittenCount: readinessRes.written,
      });
    } catch (chunkErr) {
      const message = chunkErr instanceof Error ? chunkErr.message : String(chunkErr);
      const { safeErrorCode } = categorizeOuraSafeError(chunkErr);
      lastChunkError = message;
      lastChunkSafeErrorCode = safeErrorCode;
      logOuraRefreshTelemetry({
        operation: "oura_backfill_chunk_failed",
        requestId,
        chunkIndex,
        chunkCount,
        chunkDayCount,
        safeErrorCode,
      });
    }
    chunkIndex += 1;
  }

  const anyWritten = totalSleepWritten + totalReadinessWritten > 0;
  try {
    if (anyWritten) {
      await setBackfillCompleted();
      logOuraRefreshTelemetry({
        operation: "oura_backfill_completed",
        requestId,
        sleepSnapshotWrittenCount: totalSleepWritten,
        readinessSnapshotWrittenCount: totalReadinessWritten,
      });
    } else {
      const errMsg = lastChunkError ?? "No data imported";
      await setBackfillFailed(errMsg);
      logOuraRefreshTelemetry({
        operation: "oura_backfill_failed",
        requestId,
        safeErrorCode: lastChunkSafeErrorCode ?? "UNKNOWN",
      });
    }
  } catch (metaErr) {
    logOuraRefreshTelemetry({
      operation: "oura_backfill_failed",
      requestId,
      safeErrorCode: categorizeOuraSafeError(metaErr).safeErrorCode,
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
