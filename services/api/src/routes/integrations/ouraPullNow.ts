/**
 * POST /integrations/oura/pull-now — user-authenticated first-sync / pull from Oura API.
 * Fetches sleep + daily_readiness (HRV), maps to ingest shapes, writes raw events, updates lastSyncAt.
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
  mapOuraSleepToIngestItem,
  mapOuraReadinessToHrvItem,
  type OuraSleepIngestItem,
  type OuraHrvIngestItem,
  OuraApiError,
} from "../../lib/ouraApi";
import { writeOuraRawEvents } from "../../lib/ouraIngestWrite";
import { writeFailure } from "../../lib/writeFailure";
import { logger } from "../../lib/logger";

const router = Router();

/** Pull last N days of data (sleep + readiness). */
const WINDOW_DAYS = 30;

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

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - WINDOW_DAYS);
  const startStr = toYmd(startDate);
  const endStr = toYmd(endDate);

  let sleepItems: OuraSleepIngestItem[];
  let hrvItems: OuraHrvIngestItem[];

  try {
    const [sleepDocs, readinessDocs] = await Promise.all([
      fetchOuraSleep(accessToken, startStr, endStr),
      fetchOuraDailyReadiness(accessToken, startStr, endStr),
    ]);
    sleepItems = sleepDocs.map(mapOuraSleepToIngestItem).filter((x): x is OuraSleepIngestItem => x !== null);
    hrvItems = readinessDocs.map(mapOuraReadinessToHrvItem).filter((x): x is OuraHrvIngestItem => x !== null);
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

  const { eventsCreated, eventsAlreadyExists } = await writeOuraRawEvents(
    uid,
    sleepItems,
    hrvItems,
    requestId,
  );

  try {
    const integrationRef = userCollection(uid, "integrations").doc("oura");
    await integrationRef.set(
      { lastSyncAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch (metaErr) {
    logger.error({
      msg: "oura_pull_now_metadata_error",
      uid,
      requestId,
      err: metaErr instanceof Error ? metaErr.message : String(metaErr),
    });
    return {
      statusCode: 500,
      body: {
        ok: false as const,
        error: {
          code: "INTERNAL" as const,
          message: "Failed to update lastSyncAt",
          requestId,
        },
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      ok: true as const,
      requestId,
      windowDays: WINDOW_DAYS,
      eventsCreated,
      eventsAlreadyExists,
    },
  };
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
