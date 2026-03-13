/**
 * Phase 3A Sprint 3A.0 — Withings OAuth + token custody.
 * GET connect (auth), GET callback (public), GET status (auth), POST revoke (auth).
 */

import { Router, type Request, type Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { FieldValue, userCollection, withingsConnectedRegistryDoc, ouraConnectedRegistryDoc } from "../db";
import { createStateAsync, validateAndConsumeState } from "../lib/oauthState";
import * as withingsSecrets from "../lib/withingsSecrets";
import * as ouraSecrets from "../lib/ouraSecrets";
import { logger } from "../lib/logger";

const router = Router();

const WITHINGS_AUTHORIZE_URL = "https://account.withings.com/oauth2_user/authorize2";
const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const SCOPE = "user.metrics";

const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_SCOPE = "daily heartrate";
const OURA_OAUTH_PURPOSE = "oura_oauth";

/** Defaults for auto-start backfill (must match withingsBackfill semantics). */
const BACKFILL_AUTO_START = {
  yearsBack: 10,
  chunkDays: 90,
  maxChunksPerRun: 5,
};
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

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
 * Canonical redirect URI: prefer PUBLIC_BASE_URL (deterministic behind gateway), else forwarded host/proto.
 */
function getCanonicalRedirectUri(req: Request): string | null {
  const publicBase = (process.env.PUBLIC_BASE_URL ?? "").trim();
  if (publicBase) {
    if (!publicBase.startsWith("https://")) return null; // fail closed (no http)
    return `${normalizeBaseUrl(publicBase)}/integrations/withings/callback`;
  }

  // fallback: existing x-forwarded-proto + forwarded host logic
  const xfProto = firstHeaderValue(req.headers["x-forwarded-proto"] as string | string[] | undefined);
  const proto = xfProto || "https";
  const host = getForwardedHost(req);
  if (!host) return null;
  return `${proto}://${host}/integrations/withings/callback`;
}

/**
 * Fail-closed: if WITHINGS_REDIRECT_URI is set and does not match canonical, return 500.
 * If blank, use canonical. Never accept mismatched hosts or fallback to stale URLs.
 */
function assertRedirectUriOrFailClosed(
  req: Request,
  res: Response,
  rid: string,
): { ok: true; redirectUri: string } | { ok: false } {
  const canonical = getCanonicalRedirectUri(req);
  if (!canonical) {
    res.status(500).json({
      ok: false,
      error: {
        code: "SERVER_MISCONFIG",
        message: "Missing host for redirect URI",
        requestId: rid,
      },
    });
    return { ok: false };
  }

  const configured = (process.env.WITHINGS_REDIRECT_URI ?? "").trim();

  if (configured && configured !== canonical) {
    res.status(500).json({
      ok: false,
      error: {
        code: "SERVER_MISCONFIG",
        message: `WITHINGS_REDIRECT_URI mismatch. Expected ${canonical}`,
        requestId: rid,
      },
    });
    return { ok: false };
  }

  return { ok: true, redirectUri: canonical };
}

/**
 * Canonical redirect URI for Oura callback (same pattern as Withings).
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

const STATUS_DEFAULTS = {
  connected: false,
  scopes: [] as string[],
  connectedAt: null as string | null,
  revoked: false,
  failureState: null as Record<string, unknown> | null,
};

/** GET /integrations/withings/status — read integration metadata from Firestore. AUTH REQUIRED. No tokens. */
router.get("/withings/status", async (req: AuthedRequest, res: Response) => {
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  try {
    const ref = userCollection(uid, "integrations").doc("withings");
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(200).json({
        ok: true as const,
        ...STATUS_DEFAULTS,
      });
    }
    const data = snap.data() as {
      connected?: boolean;
      scopes?: string[];
      connectedAt?: FirebaseFirestore.Timestamp | Date;
      revoked?: boolean;
      failureState?: Record<string, unknown> | null;
      backfill?: {
        status?: string;
        yearsBack?: number;
        chunkDays?: number;
        maxChunksPerRun?: number;
        cursorStartSec?: number;
        cursorEndSec?: number;
        processedCount?: number;
        lastError?: { code: string; message: string; atIso: string } | null;
        updatedAt?: FirebaseFirestore.Timestamp | Date;
      };
    } | undefined;
    if (!data) {
      return res.status(200).json({
        ok: true as const,
        ...STATUS_DEFAULTS,
      });
    }

    // Auto-start backfill once when connected and backfill never started (idempotent; no endless writes).
    let snapToUse = snap;
    if (data.connected && !data.backfill) {
      const nowSec = Math.floor(Date.now() / 1000);
      const cursorStartSec = nowSec - BACKFILL_AUTO_START.yearsBack * SECONDS_PER_YEAR;
      try {
        await ref.set(
          {
            backfill: {
              status: "running" as const,
              yearsBack: BACKFILL_AUTO_START.yearsBack,
              chunkDays: BACKFILL_AUTO_START.chunkDays,
              maxChunksPerRun: BACKFILL_AUTO_START.maxChunksPerRun,
              cursorStartSec,
              cursorEndSec: nowSec,
              processedCount: 0,
              lastError: null,
              updatedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        );
        snapToUse = await ref.get();
      } catch (err) {
        logger.error({
          msg: "withings_status_autostart_error",
          rid: getRequestId(req, res),
          uid,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const dataToUse = snapToUse.exists ? (snapToUse.data() as typeof data) : data;
    const backfill = dataToUse?.backfill;
    const backfillPayload =
      backfill && typeof backfill.status === "string"
        ? {
            status: backfill.status,
            yearsBack: backfill.yearsBack,
            chunkDays: backfill.chunkDays,
            maxChunksPerRun: backfill.maxChunksPerRun,
            cursorStartSec: backfill.cursorStartSec,
            cursorEndSec: backfill.cursorEndSec,
            processedCount: backfill.processedCount,
            lastError: backfill.lastError ?? null,
            updatedAt: toIsoOrNull(backfill.updatedAt),
          }
        : undefined;
    return res.status(200).json({
      ok: true as const,
      connected: Boolean(dataToUse?.connected),
      scopes: Array.isArray(dataToUse?.scopes) ? dataToUse.scopes : [],
      connectedAt: toIsoOrNull(dataToUse?.connectedAt),
      revoked: Boolean(dataToUse?.revoked),
      failureState: dataToUse?.failureState ?? null,
      backfill: backfillPayload ?? undefined,
    });
  } catch (err) {
    const rid = getRequestId(req, res);
    logger.error({ msg: "withings_status_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

/** GET /integrations/withings/connect — create state, return authorization URL. AUTH REQUIRED. */
router.get("/withings/connect", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  const redirect = assertRedirectUriOrFailClosed(req, res, rid);
  if (!redirect.ok) return;

  const redirectUri = redirect.redirectUri;
  const clientId = process.env.WITHINGS_CLIENT_ID?.trim();
  if (!clientId) {
    logger.error({ msg: "withings_connect_misconfig", rid, hasClientId: false });
    return res.status(500).json({
      ok: false,
      error: { code: "SERVER_MISCONFIG", message: "Withings OAuth not configured", requestId: rid },
    });
  }

  try {
    const { stateForRedirect } = await createStateAsync(uid);
    const url = new URL(WITHINGS_AUTHORIZE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", stateForRedirect);
    return res.status(200).json({ ok: true as const, url: url.toString() });
  } catch (err) {
    logger.error({ msg: "withings_connect_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

async function writeFailureState(
  uid: string,
  code: string,
  message: string,
): Promise<void> {
  const ref = userCollection(uid, "integrations").doc("withings");
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

/** GET /integrations/withings/callback — PUBLIC. Exported for mounting without auth. */
export async function handleWithingsCallback(req: Request, res: Response): Promise<void> {
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

  const validated = await validateAndConsumeState(state);
  if (!validated.ok) {
    logger.info({ msg: "withings_callback_state_invalid", rid, reason: validated.reason });
    failure("BAD_REQUEST", `Invalid state: ${validated.reason}`);
    return;
  }

  const { uid } = validated;

  const redirect = assertRedirectUriOrFailClosed(req, res, rid);
  if (!redirect.ok) {
    await writeFailureState(
      uid,
      "WITHINGS_OAUTH_MISCONFIG",
      "WITHINGS_REDIRECT_URI mismatch or host missing",
    );
    return;
  }

  const redirectUri = redirect.redirectUri;
  const clientId = process.env.WITHINGS_CLIENT_ID?.trim();

  let clientSecret: string | null = null;
  try {
    clientSecret = await withingsSecrets.getClientSecret();
  } catch (err) {
    if (err instanceof withingsSecrets.WithingsConfigError) {
      logger.error({ msg: "withings_callback_secret_manager_config_missing", rid });
      await writeFailureState(uid, "WITHINGS_SECRET_MANAGER_CONFIG_MISSING", "Secret Manager not configured");
      res.status(500).json({
        ok: false,
        error: {
          code: "WITHINGS_SECRET_MANAGER_CONFIG_MISSING",
          message: "Secret Manager not configured",
          requestId: rid,
        },
      });
      return;
    }
    throw err;
  }

  if (!clientId || !clientSecret) {
    logger.error({ msg: "withings_callback_misconfig", rid });
    await writeFailureState(uid, "WITHINGS_OAUTH_MISCONFIG", "Withings OAuth not configured");
    res.status(500).json({
      ok: false,
      error: { code: "SERVER_MISCONFIG", message: "Withings OAuth not configured", requestId: rid },
    });
    return;
  }

  try {
    const tokenRes = await fetch(WITHINGS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "requesttoken",
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = (await tokenRes.json()) as {
      status?: number;
      body?: { refresh_token?: string; access_token?: string; expires_in?: number; error?: string };
    };

    if (tokenRes.status !== 200 || tokenJson.status !== 0) {
      const errMsg = tokenJson.body?.error ?? `HTTP ${tokenRes.status}`;
      logger.info({ msg: "withings_token_exchange_failed", rid, uid, status: tokenRes.status, errMsg });
      await writeFailureState(uid, "WITHINGS_TOKEN_EXCHANGE_FAILED", errMsg);
      failure("BAD_REQUEST", "Token exchange failed");
      return;
    }

    const refreshToken = tokenJson.body?.refresh_token;
    if (!refreshToken || typeof refreshToken !== "string") {
      await writeFailureState(uid, "WITHINGS_TOKEN_MISSING", "No refresh_token in response");
      failure("BAD_REQUEST", "No refresh token in response");
      return;
    }

    await withingsSecrets.setRefreshToken(uid, refreshToken);

    const nowSec = Math.floor(Date.now() / 1000);
    const cursorStartSec = nowSec - BACKFILL_AUTO_START.yearsBack * SECONDS_PER_YEAR;
    const integrationRef = userCollection(uid, "integrations").doc("withings");
    await integrationRef.set(
      {
        connected: true,
        scopes: [SCOPE],
        connectedAt: FieldValue.serverTimestamp(),
        lastSyncAt: null,
        revoked: false,
        failureState: null,
        backfill: {
          status: "running" as const,
          yearsBack: BACKFILL_AUTO_START.yearsBack,
          chunkDays: BACKFILL_AUTO_START.chunkDays,
          maxChunksPerRun: BACKFILL_AUTO_START.maxChunksPerRun,
          cursorStartSec,
          cursorEndSec: nowSec,
          processedCount: 0,
          lastError: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );

    try {
      await withingsConnectedRegistryDoc(uid).set(
        { connected: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } catch (registryErr) {
      const msg = registryErr instanceof Error ? registryErr.message : String(registryErr);
      logger.error({ msg: "withings_registry_write_error", rid, uid, err: msg });
    }

    // Prefer PUBLIC_BASE_URL so redirect lands on gateway, never on invoker-only run.app
    const publicBase = (process.env.PUBLIC_BASE_URL ?? "").trim();
    const completionUrl =
      publicBase && publicBase.startsWith("https://")
        ? `${normalizeBaseUrl(publicBase)}/integrations/withings/complete`
        : "com.olifitness.oli://withings-connected";
    res.redirect(302, completionUrl);
  } catch (err) {
    if (err instanceof withingsSecrets.WithingsConfigError) {
      logger.error({ msg: "withings_callback_secret_manager_config_missing", rid });
      await writeFailureState(uid, "WITHINGS_SECRET_MANAGER_CONFIG_MISSING", "Secret Manager not configured");
      res.status(500).json({
        ok: false,
        error: {
          code: "WITHINGS_SECRET_MANAGER_CONFIG_MISSING",
          message: "Secret Manager not configured",
          requestId: rid,
        },
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "withings_callback_error", rid, uid, err: message });
    await writeFailureState(uid, "WITHINGS_CALLBACK_ERROR", message);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
}

/** POST /integrations/withings/revoke — destroy secret versions, update metadata. AUTH REQUIRED. */
router.post("/withings/revoke", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  try {
    await withingsSecrets.deleteRefreshToken(uid);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ msg: "withings_revoke_error", rid, uid, err: message });
    await writeFailureState(uid, "WITHINGS_REVOKE_SECRET_FAILED", message);
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }

  try {
    const ref = userCollection(uid, "integrations").doc("withings");
    await ref.set(
      {
        connected: false,
        revoked: true,
        failureState: null,
      },
      { merge: true },
    );
    try {
      await withingsConnectedRegistryDoc(uid).delete();
    } catch (registryErr) {
      const msg = registryErr instanceof Error ? registryErr.message : String(registryErr);
      logger.error({ msg: "withings_registry_delete_error", rid, uid, err: msg });
    }
    return res.status(200).json({ ok: true as const });
  } catch (err) {
    logger.error({ msg: "withings_revoke_metadata_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

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
        revoked: false,
        failureState: null,
      });
    }
    const data = snap.data() as {
      connected?: boolean;
      connectedAt?: FirebaseFirestore.Timestamp | Date;
      lastSyncAt?: FirebaseFirestore.Timestamp | Date | string | null;
      revoked?: boolean;
      failureState?: Record<string, unknown> | null;
    } | undefined;
    if (!data) {
      return res.status(200).json({
        ok: true as const,
        requestId: rid,
        connected: false,
        lastSyncAt: null,
        revoked: false,
        failureState: null,
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
    return res.status(200).json({
      ok: true as const,
      requestId: rid,
      connected: Boolean(data.connected),
      lastSyncAt,
      revoked: Boolean(data.revoked),
      failureState: data.failureState ?? null,
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

    const publicBase = (process.env.PUBLIC_BASE_URL ?? "").trim();
    const completionUrl =
      publicBase && publicBase.startsWith("https://")
        ? `${normalizeBaseUrl(publicBase)}/integrations/oura/complete`
        : "com.olifitness.oli://oura-connected";
    res.redirect(302, completionUrl);
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
