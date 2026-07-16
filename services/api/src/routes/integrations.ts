/**
 * Integrations OAuth + status routes.
 */

import { Router, type Request, type Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { FieldValue, userCollection, ouraConnectedRegistryDoc } from "../db";
import { createStateAsync, validateAndConsumeState } from "../lib/oauthState";
import * as ouraSecrets from "../lib/ouraSecrets";
import { logger } from "../lib/logger";
import { performOuraPullNowCore, triggerOuraBackfill } from "./integrations/ouraPullNow";

const router = Router();

const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
/**
 * Full Oura API v2 scopes: email, personal, daily (sleep/readiness/activity/daily_stress),
 * heartrate, workout, tag, session, spo2Daily.
 * `daily` already covers Daily Stress (`/v2/usercollection/daily_stress`) — no OAuth reconnect required.
 */
const OURA_SCOPE = "email personal daily heartrate workout tag session spo2Daily";
const OURA_OAUTH_PURPOSE = "oura_oauth";

const getRequestId = (req: Request, res: Response): string =>
  (req as AuthedRequest).rid ?? res.getHeader("x-request-id")?.toString() ?? "unknown";

function firstHeaderValue(v: string | string[] | undefined): string {
  if (!v) return "";
  const s = Array.isArray(v) ? (v[0] ?? "") : v;
  return (s.split(",")[0] ?? "").trim();
}

function getForwardedHost(req: Request): string {
  const xfHost = firstHeaderValue(req.headers["x-forwarded-host"] as string | string[] | undefined);
  if (xfHost) return xfHost;

  const forwarded = firstHeaderValue(req.headers["forwarded"] as string | string[] | undefined);
  if (forwarded) {
    const m = forwarded.match(/host="?([^;"]+)"?/i);
    if (m?.[1]) return m[1].trim();
  }

  return req.get("host") ?? "";
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Canonical redirect URI for Oura callback.
 */
function getCanonicalRedirectUriOura(req: Request): string | null {
  const publicBase = (process.env.PUBLIC_BASE_URL ?? "").trim();
  if (publicBase) {
    if (!publicBase.startsWith("https://")) return null;
    return `${normalizeBaseUrl(publicBase)}/integrations/oura/callback`;
  }
  const xfProto = firstHeaderValue(req.headers["x-forwarded-proto"] as string | string[] | undefined);
  const proto = xfProto || "https";
  const host = getForwardedHost(req);
  if (!host) return null;
  return `${proto}://${host}/integrations/oura/callback`;
}

function assertOuraRedirectUriOrFailClosed(
  req: Request,
  res: Response,
  rid: string,
): { ok: true; redirectUri: string } | { ok: false } {
  const canonical = getCanonicalRedirectUriOura(req);
  if (!canonical) {
    res.status(500).json({
      ok: false,
      error: {
        code: "SERVER_MISCONFIG",
        message: "Missing host for Oura redirect URI",
        requestId: rid,
      },
    });
    return { ok: false };
  }
  const configured = (process.env.OURA_REDIRECT_URI ?? "").trim();
  if (configured && configured !== canonical) {
    res.status(500).json({
      ok: false,
      error: {
        code: "SERVER_MISCONFIG",
        message: `OURA_REDIRECT_URI mismatch. Expected ${canonical}`,
        requestId: rid,
      },
    });
    return { ok: false };
  }
  return { ok: true, redirectUri: canonical };
}

const assertAuthedUid = (req: AuthedRequest, res: Response): string | null => {
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId: getRequestId(req, res) },
    });
    return null;
  }
  return uid;
};

/** Convert Firestore Timestamp or Date to ISO string; otherwise null. Never expose tokens. */
function toIsoOrNull(
  value: FirebaseFirestore.Timestamp | Date | unknown,
): string | null {
  if (value == null) return null;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as FirebaseFirestore.Timestamp).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

// ---------------------------- Oura OAuth ----------------------------

async function writeOuraFailureState(
  uid: string,
  code: string,
  message: string,
): Promise<void> {
  const ref = userCollection(uid, "integrations").doc("oura");
  await ref.set(
    {
      connected: false,
      failureState: {
        code,
        message,
        lastOccurredAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
}

/** GET /integrations/oura/status — read integration metadata from Firestore. AUTH REQUIRED. */
router.get("/oura/status", async (req: AuthedRequest, res: Response) => {
  // eslint-disable-next-line no-console -- temporary debug for Oura route verification
  console.log("[OURA_STATUS_HIT]");
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  try {
    const ref = userCollection(uid, "integrations").doc("oura");
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(200).json({
        ok: true as const,
        requestId: rid,
        connected: false,
        lastSyncAt: null,
        lastRefreshAt: null,
        lastSnapshotAt: null,
        revoked: false,
        failureState: null,
        backfillStatus: null,
        backfillStartedAt: null,
        backfillCompletedAt: null,
        backfillFailedAt: null,
        lastBackfillError: null,
      });
    }
    const data = snap.data() as {
      connected?: boolean;
      connectedAt?: FirebaseFirestore.Timestamp | Date;
      lastSyncAt?: FirebaseFirestore.Timestamp | Date | string | null;
      lastRefreshAt?: FirebaseFirestore.Timestamp | Date | string | null;
      lastSnapshotAt?: FirebaseFirestore.Timestamp | Date | string | null;
      revoked?: boolean;
      failureState?: Record<string, unknown> | null;
      backfillStatus?: string | null;
      backfillStartedAt?: FirebaseFirestore.Timestamp | Date | string | null;
      backfillCompletedAt?: FirebaseFirestore.Timestamp | Date | string | null;
      backfillFailedAt?: FirebaseFirestore.Timestamp | Date | string | null;
      lastBackfillError?: string | null;
    } | undefined;
    if (!data) {
      return res.status(200).json({
        ok: true as const,
        requestId: rid,
        connected: false,
        lastSyncAt: null,
        lastRefreshAt: null,
        lastSnapshotAt: null,
        revoked: false,
        failureState: null,
        backfillStatus: null,
        backfillStartedAt: null,
        backfillCompletedAt: null,
        backfillFailedAt: null,
        lastBackfillError: null,
      });
    }
    let lastSyncAt: string | null = null;
    if (data.lastSyncAt != null) {
      if (typeof data.lastSyncAt === "string") {
        lastSyncAt = data.lastSyncAt;
      } else {
        lastSyncAt = toIsoOrNull(data.lastSyncAt);
      }
    }
    let lastRefreshAt: string | null = null;
    if (data.lastRefreshAt != null) {
      if (typeof data.lastRefreshAt === "string") {
        lastRefreshAt = data.lastRefreshAt;
      } else {
        lastRefreshAt = toIsoOrNull(data.lastRefreshAt);
      }
    }
    let lastSnapshotAt: string | null = null;
    if (data.lastSnapshotAt != null) {
      if (typeof data.lastSnapshotAt === "string") {
        lastSnapshotAt = data.lastSnapshotAt;
      } else {
        lastSnapshotAt = toIsoOrNull(data.lastSnapshotAt);
      }
    }
    const backfillStatus =
      typeof data.backfillStatus === "string" && ["idle", "running", "completed", "failed"].includes(data.backfillStatus)
        ? data.backfillStatus
        : null;
    let backfillStartedAt: string | null = null;
    if (data.backfillStartedAt != null) {
      backfillStartedAt = typeof data.backfillStartedAt === "string" ? data.backfillStartedAt : toIsoOrNull(data.backfillStartedAt);
    }
    let backfillCompletedAt: string | null = null;
    if (data.backfillCompletedAt != null) {
      backfillCompletedAt = typeof data.backfillCompletedAt === "string" ? data.backfillCompletedAt : toIsoOrNull(data.backfillCompletedAt);
    }
    let backfillFailedAt: string | null = null;
    if (data.backfillFailedAt != null) {
      backfillFailedAt = typeof data.backfillFailedAt === "string" ? data.backfillFailedAt : toIsoOrNull(data.backfillFailedAt);
    }
    const lastBackfillError =
      typeof data.lastBackfillError === "string" ? data.lastBackfillError : data.lastBackfillError == null ? null : String(data.lastBackfillError);
    return res.status(200).json({
      ok: true as const,
      requestId: rid,
      connected: Boolean(data.connected),
      lastSyncAt,
      lastRefreshAt,
      lastSnapshotAt,
      revoked: Boolean(data.revoked),
      failureState: data.failureState ?? null,
      backfillStatus,
      backfillStartedAt,
      backfillCompletedAt,
      backfillFailedAt,
      lastBackfillError,
    });
  } catch (err) {
    logger.error({ msg: "oura_status_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

/** GET /integrations/oura/connect — create state, return Oura authorization URL. AUTH REQUIRED. */
router.get("/oura/connect", async (req: AuthedRequest, res: Response) => {
  // eslint-disable-next-line no-console -- temporary debug for Oura route verification
  console.log("[OURA_CONNECT_HIT]");
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  const redirect = assertOuraRedirectUriOrFailClosed(req, res, rid);
  if (!redirect.ok) return;

  const clientId = process.env.OURA_CLIENT_ID?.trim();
  if (!clientId) {
    logger.error({ msg: "oura_connect_misconfig", rid, hasClientId: false });
    return res.status(500).json({
      ok: false,
      error: { code: "SERVER_MISCONFIG", message: "Oura OAuth not configured", requestId: rid },
    });
  }

  try {
    const { stateForRedirect } = await createStateAsync(uid, OURA_OAUTH_PURPOSE);
    const url = new URL(OURA_AUTHORIZE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", OURA_SCOPE);
    url.searchParams.set("redirect_uri", redirect.redirectUri);
    url.searchParams.set("state", stateForRedirect);
    return res.status(200).json({ ok: true as const, url: url.toString() });
  } catch (err) {
    logger.error({ msg: "oura_connect_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

/** GET /integrations/oura/callback — PUBLIC. Exported for mounting without auth. */
export async function handleOuraCallback(req: Request, res: Response): Promise<void> {
  const rid = getRequestId(req, res);
  const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
  const state = typeof req.query.state === "string" ? req.query.state.trim() : "";

  const failure = (code: string, message: string) => {
    res.status(400).json({ ok: false, error: { code, message, requestId: rid } });
  };

  if (!code || !state) {
    failure("BAD_REQUEST", "Missing code or state");
    return;
  }

  const validated = await validateAndConsumeState(state, OURA_OAUTH_PURPOSE);
  if (!validated.ok) {
    logger.info({ msg: "oura_callback_state_invalid", rid, reason: validated.reason });
    failure("BAD_REQUEST", `Invalid state: ${validated.reason}`);
    return;
  }

  const { uid } = validated;

  const redirect = assertOuraRedirectUriOrFailClosed(req, res, rid);
  if (!redirect.ok) {
    await writeOuraFailureState(uid, "OURA_OAUTH_MISCONFIG", "OURA_REDIRECT_URI mismatch or host missing");
    return;
  }

  const redirectUri = redirect.redirectUri;
  const clientId = process.env.OURA_CLIENT_ID?.trim();

  let clientSecret: string | null = null;
  try {
    clientSecret = await ouraSecrets.getClientSecret();
  } catch (err) {
    if (err instanceof ouraSecrets.OuraConfigError) {
      logger.error({ msg: "oura_callback_secret_manager_config_missing", rid });
      await writeOuraFailureState(uid, "OURA_SECRET_MANAGER_CONFIG_MISSING", "Secret Manager not configured");
      res.status(500).json({
        ok: false,
        error: {
          code: "OURA_SECRET_MANAGER_CONFIG_MISSING",
          message: "Secret Manager not configured",
          requestId: rid,
        },
      });
      return;
    }
    throw err;
  }

  if (!clientId || !clientSecret) {
    logger.error({ msg: "oura_callback_misconfig", rid });
    await writeOuraFailureState(uid, "OURA_OAUTH_MISCONFIG", "Oura OAuth not configured");
    res.status(500).json({
      ok: false,
      error: { code: "SERVER_MISCONFIG", message: "Oura OAuth not configured", requestId: rid },
    });
    return;
  }

  try {
    const tokenRes = await fetch(OURA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (tokenRes.status !== 200 || tokenJson.error) {
      const errMsg = tokenJson.error ?? `HTTP ${tokenRes.status}`;
      logger.info({ msg: "oura_token_exchange_failed", rid, uid, status: tokenRes.status, errMsg });
      await writeOuraFailureState(uid, "OURA_TOKEN_EXCHANGE_FAILED", errMsg);
      failure("BAD_REQUEST", "Token exchange failed");
      return;
    }

    const refreshToken = tokenJson.refresh_token;
    if (!refreshToken || typeof refreshToken !== "string") {
      await writeOuraFailureState(uid, "OURA_TOKEN_MISSING", "No refresh_token in response");
      failure("BAD_REQUEST", "No refresh token in response");
      return;
    }

    await ouraSecrets.setRefreshToken(uid, refreshToken);

    const integrationRef = userCollection(uid, "integrations").doc("oura");
    await integrationRef.set(
      {
        connected: true,
        connectedAt: FieldValue.serverTimestamp(),
        lastSyncAt: null,
        revoked: false,
        failureState: null,
        backfillStatus: "running" as const,
        backfillStartedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    try {
      await ouraConnectedRegistryDoc(uid).set(
        { connected: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } catch (registryErr) {
      const msg = registryErr instanceof Error ? registryErr.message : String(registryErr);
      logger.error({ msg: "oura_registry_write_error", rid, uid, err: msg });
    }

    // Use same host as callback so browser lands on a URL that matches client's return URL (openAuthSessionAsync).
    const callbackUrl = redirect.redirectUri;
    const completionUrl = /\/integrations\/oura\/callback$/i.test(callbackUrl)
      ? callbackUrl.replace(/\/integrations\/oura\/callback$/i, "/integrations/oura/complete")
      : "com.olifitness.oli://oura-connected";
    // eslint-disable-next-line no-console -- temporary debug for Oura callback return flow
    console.log("[OURA_CALLBACK_REDIRECT]", { requestId: rid, stateValid: true, completionUrl });
    res.redirect(302, completionUrl);
    // Fire-and-forget: kick off first sync so lastSyncAt updates without blocking redirect.
    void performOuraPullNowCore(uid, rid).catch((err: unknown) =>
      logger.error({
        msg: "oura_callback_auto_sync_error",
        rid,
        uid,
        err: err instanceof Error ? err.message : String(err),
      }),
    );
    // Fire-and-forget: backfill recent Oura history (sleep + readiness) so screens feel alive.
    void triggerOuraBackfill(uid, rid).catch((err: unknown) =>
      logger.error({
        msg: "oura_callback_backfill_error",
        rid,
        uid,
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  } catch (err) {
    if (err instanceof ouraSecrets.OuraConfigError) {
      logger.error({ msg: "oura_callback_secret_manager_config_missing", rid });
      await writeOuraFailureState(uid, "OURA_SECRET_MANAGER_CONFIG_MISSING", "Secret Manager not configured");
      res.status(500).json({
        ok: false,
        error: {
          code: "OURA_SECRET_MANAGER_CONFIG_MISSING",
          message: "Secret Manager not configured",
          requestId: rid,
        },
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "oura_callback_error", rid, uid, err: message });
    await writeOuraFailureState(uid, "OURA_CALLBACK_ERROR", message);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
}

/** POST /integrations/oura/revoke — destroy token, update metadata. AUTH REQUIRED. */
router.post("/oura/revoke", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  try {
    await ouraSecrets.deleteRefreshToken(uid);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "oura_revoke_error", rid, uid, err: message });
    await writeOuraFailureState(uid, "OURA_REVOKE_SECRET_FAILED", message);
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }

  try {
    const ref = userCollection(uid, "integrations").doc("oura");
    await ref.set(
      {
        connected: false,
        revoked: true,
        failureState: null,
      },
      { merge: true },
    );
    try {
      await ouraConnectedRegistryDoc(uid).delete();
    } catch (registryErr) {
      const msg = registryErr instanceof Error ? registryErr.message : String(registryErr);
      logger.error({ msg: "oura_registry_delete_error", rid, uid, err: msg });
    }
    return res.status(200).json({ ok: true as const });
  } catch (err) {
    logger.error({ msg: "oura_revoke_metadata_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

export default router;
