/**
 * Phase 3A Sprint 3A.0 — Withings OAuth + token custody.
 * GET connect (auth), GET callback (public), POST revoke (auth).
 */

import { Router, type Request, type Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { FieldValue, userCollection } from "../db";
import { createStateAsync, validateAndConsumeState } from "../lib/oauthState";
import * as withingsSecrets from "../lib/withingsSecrets";
import { logger } from "../lib/logger";

const router = Router();

const WITHINGS_AUTHORIZE_URL = "https://account.withings.com/oauth2_user/authorize2";
const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const SCOPE = "user.metrics";

const getRequestId = (req: Request, res: Response): string =>
  (req as AuthedRequest).rid ?? res.getHeader("x-request-id")?.toString() ?? "unknown";

/**
 * Canonical redirect URI derived from the incoming request host.
 * Used so Withings redirects to the actual gateway host, not a stale env value.
 */
function getCanonicalRedirectUri(req: Request): string | null {
  const xfProto = (req.headers["x-forwarded-proto"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  const proto = xfProto || req.protocol || "https";
  const host = req.get("host");
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

    const integrationRef = userCollection(uid, "integrations").doc("withings");
    await integrationRef.set(
      {
        connected: true,
        scopes: [SCOPE],
        connectedAt: FieldValue.serverTimestamp(),
        lastSyncAt: null,
        revoked: false,
        failureState: null,
      },
      { merge: true },
    );

    const xfProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
    const proto = xfProto || "https";
    const host = req.get("host");
    const completionUrl = host
      ? `${proto}://${host}/integrations/withings/complete`
      : "oli://withings-connected";
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
    return res.status(200).json({ ok: true as const });
  } catch (err) {
    logger.error({ msg: "withings_revoke_metadata_error", rid, uid, err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: "Internal Server Error", requestId: rid },
    });
  }
});

export default router;
