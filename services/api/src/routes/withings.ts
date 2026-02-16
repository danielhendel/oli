/**
 * Phase 3A — Withings scale integration (weight only).
 *
 * - OAuth 2.0 connect/callback; tokens stored server-side at users/{uid}/sources/withings.
 * - Callback is PUBLIC (no auth) so Withings redirect can hit it; uid comes from state (validated).
 * - status/connect/pull are AUTHED only.
 * - Poll-based pull writes RawEvents via single ingestion front door.
 * - No client writes to derived collections; append-only RawEvents; Idempotency-Key per measure.
 * - Secrets/tokens never logged; errors redacted.
 */
import { Router, type Request, type Response } from "express";
import { rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { userCollection, userDoc } from "../db";
import { logger } from "../lib/logger";

const WITHINGS_AUTH_BASE = "https://account.withings.com/oauth2_user/authorize";
const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const WITHINGS_MEASURE_URL = "https://wbsapi.withings.net/measure";
const WITHINGS_SCOPE = "user.metrics";

/** State format from connect: uid:timestamp. Used to recover uid in callback without auth. */
const STATE_REGEX = /^[a-zA-Z0-9_-]+:\d+$/;

function redact(msg: string): string {
  return msg.replace(/\b(access_token|refresh_token|code|client_secret)=[^\s&]+/gi, "$1=***");
}

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

/** Parse uid from state; returns null if invalid (safe: no token leak). */
function parseUidFromState(state: string): string | null {
  if (!STATE_REGEX.test(state)) return null;
  const idx = state.indexOf(":");
  return idx > 0 ? state.slice(0, idx) : null;
}

// ---------- Public router (no auth): OAuth callback only ----------
export const withingsPublicRoutes = Router();

/**
 * POST .../callback — No-op for Withings portal "Test" and other probes.
 * Does NOT exchange tokens; GET callback is the only handler that does.
 */
withingsPublicRoutes.post("/callback", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

/**
 * HEAD .../callback — No-op for probes. Does NOT exchange tokens.
 */
withingsPublicRoutes.head("/callback", (_req: Request, res: Response) => {
  res.status(200).end();
});

/**
 * GET .../callback?code=...&state=...
 * Public: Withings redirect has no bearer token. Uid is read from state (set by connect).
 */
withingsPublicRoutes.get("/callback", async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  if (!code || !state) {
    return res.status(400).json({
      ok: false as const,
      error: { code: "INVALID_CALLBACK" as const, message: "Missing code or state" },
    });
  }

  const uid = parseUidFromState(state);
  if (!uid) {
    return res.status(400).json({
      ok: false as const,
      error: { code: "INVALID_CALLBACK" as const, message: "Invalid state" },
    });
  }

  const clientId = getEnv("WITHINGS_CLIENT_ID");
  const clientSecret = getEnv("WITHINGS_CLIENT_SECRET");
  const redirectUri = getEnv("WITHINGS_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(503).json({
      ok: false as const,
      error: { code: "INTEGRATION_UNAVAILABLE" as const, message: "Withings integration not configured" },
    });
  }

  const body = new URLSearchParams({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  let tokenResponse: globalThis.Response;
  try {
    tokenResponse = await fetch(WITHINGS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    logger.info({ msg: "withings_callback_token_request_failed", error: redact(String(err)) });
    return res.status(502).json({
      ok: false as const,
      error: { code: "TOKEN_EXCHANGE_FAILED" as const, message: "Could not reach Withings" },
    });
  }

  const data = (await tokenResponse.json()) as {
    status?: number;
    body?: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      userid?: number;
    };
    error?: string;
  };

  if (tokenResponse.status !== 200 || data.status !== 0) {
    logger.info({ msg: "withings_callback_token_error", status: tokenResponse.status, withingsStatus: data.status });
    return res.status(400).json({
      ok: false as const,
      error: { code: "TOKEN_EXCHANGE_FAILED" as const, message: "Invalid or expired authorization code" },
    });
  }

  const accessToken = data.body?.access_token;
  const refreshToken = data.body?.refresh_token;
  const expiresIn = typeof data.body?.expires_in === "number" ? data.body.expires_in : 10800;
  const vendorUserId = data.body?.userid != null ? String(data.body.userid) : undefined;

  if (!accessToken || !refreshToken) {
    return res.status(502).json({
      ok: false as const,
      error: { code: "TOKEN_EXCHANGE_FAILED" as const, message: "No tokens in response" },
    });
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const sourceRef = userDoc(uid).collection("sources").doc("withings");

  try {
    await sourceRef.set({
      accessToken,
      refreshToken,
      expiresAt,
      vendorUserId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.info({ msg: "withings_callback_store_failed", error: redact(String(err)) });
    return res.status(500).json({
      ok: false as const,
      error: { code: "STORE_FAILED" as const, message: "Failed to store tokens" },
    });
  }

  return res.status(200).json({ ok: true as const, connected: true as const });
});

// ---------- Authed router: status, connect, pull ----------
export const withingsAuthedRoutes = Router();

/**
 * GET .../status — Returns whether Withings is connected (no tokens exposed).
 */
withingsAuthedRoutes.get("/status", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }
  const sourceRef = userDoc(uid).collection("sources").doc("withings");
  const snap = await sourceRef.get();
  const connected = snap.exists && !!((snap.data() as { accessToken?: string })?.accessToken);
  return res.status(200).json({ ok: true as const, connected });
});

/**
 * POST .../connect — Returns OAuth URL for the client to redirect the user to.
 */
withingsAuthedRoutes.post("/connect", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }

  const clientId = getEnv("WITHINGS_CLIENT_ID");
  const redirectUri = getEnv("WITHINGS_REDIRECT_URI");
  if (!clientId || !redirectUri) {
    logger.info({ msg: "withings_connect_missing_env", hasClientId: !!clientId, hasRedirectUri: !!redirectUri });
    return res.status(503).json({
      ok: false as const,
      error: { code: "INTEGRATION_UNAVAILABLE" as const, message: "Withings integration not configured" },
    });
  }

  const state = `${uid}:${Date.now()}`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: WITHINGS_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  const url = `${WITHINGS_AUTH_BASE}?${params.toString()}`;
  return res.status(200).json({ ok: true as const, url });
});

/**
 * POST .../pull — Admin/dev-only: fetches new weight measures since cursor and writes RawEvents (idempotent per measure).
 * Requires Idempotency-Key (or X-Idempotency-Key) header. Body: { timeZone: string (IANA), cursor?: number }.
 */
withingsAuthedRoutes.post("/pull", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }

  const requestIdempotencyKey =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  if (!requestIdempotencyKey || requestIdempotencyKey.trim() === "") {
    return res.status(400).json({
      ok: false as const,
      error: { code: "IDEMPOTENCY_KEY_REQUIRED" as const, message: "Idempotency-Key header is required for pull" },
    });
  }

  const timeZone = typeof (req.body as { timeZone?: unknown })?.timeZone === "string"
    ? (req.body as { timeZone: string }).timeZone
    : undefined;
  if (!timeZone) {
    return res.status(400).json({
      ok: false as const,
      error: { code: "TIMEZONE_REQUIRED" as const, message: "timeZone (IANA) is required" },
    });
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    return res.status(400).json({
      ok: false as const,
      error: { code: "TIMEZONE_INVALID" as const, message: "Invalid timeZone" },
    });
  }

  const sourceRef = userDoc(uid).collection("sources").doc("withings");
  const sourceSnap = await sourceRef.get();
  if (!sourceSnap.exists) {
    return res.status(412).json({
      ok: false as const,
      error: { code: "NOT_CONNECTED" as const, message: "Withings not connected" },
    });
  }

  const data = sourceSnap.data() as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    vendorUserId?: string;
  } | undefined;
  let accessToken = data?.accessToken;
  const refreshToken = data?.refreshToken;
  const vendorUserId = data?.vendorUserId;

  if (!accessToken || !refreshToken) {
    return res.status(412).json({
      ok: false as const,
      error: { code: "NOT_CONNECTED" as const, message: "Withings tokens missing" },
    });
  }

  const now = new Date();
  const expiresAt = data?.expiresAt ? new Date(data.expiresAt).getTime() : 0;
  if (expiresAt - now.getTime() < 300_000) {
    const clientId = getEnv("WITHINGS_CLIENT_ID");
    const clientSecret = getEnv("WITHINGS_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return res.status(503).json({
        ok: false as const,
        error: { code: "INTEGRATION_UNAVAILABLE" as const, message: "Withings not configured" },
      });
    }
    const refreshBody = new URLSearchParams({
      action: "requesttoken",
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    const refreshRes = await fetch(WITHINGS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: refreshBody.toString(),
    });
    const refreshData = (await refreshRes.json()) as {
      status?: number;
      body?: { access_token?: string; refresh_token?: string; expires_in?: number };
    };
    if (refreshRes.status !== 200 || refreshData.status !== 0 || !refreshData.body?.access_token) {
      logger.info({ msg: "withings_pull_refresh_failed", status: refreshRes.status });
      return res.status(401).json({
        ok: false as const,
        error: { code: "TOKEN_REFRESH_FAILED" as const, message: "Withings token refresh failed" },
      });
    }
    accessToken = refreshData.body.access_token;
    const newRefresh = refreshData.body.refresh_token;
    const newExpiresIn = refreshData.body.expires_in ?? 10800;
    await sourceRef.set({
      ...data,
      accessToken,
      refreshToken: newRefresh,
      expiresAt: new Date(Date.now() + newExpiresIn * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  const cursor = typeof (req.body as { cursor?: unknown })?.cursor === "number"
    ? (req.body as { cursor: number }).cursor
    : 0;

  const measureParams = new URLSearchParams({
    action: "getmeas",
    access_token: accessToken,
    ...(vendorUserId ? { userid: vendorUserId } : {}),
    ...(cursor > 0 ? { lastupdate: String(cursor) } : {}),
  });

  let measResponse: globalThis.Response;
  try {
    measResponse = await fetch(`${WITHINGS_MEASURE_URL}?${measureParams.toString()}`);
  } catch (err) {
    logger.info({ msg: "withings_pull_getmeas_failed", error: redact(String(err)) });
    return res.status(502).json({
      ok: false as const,
      error: { code: "MEASURE_FETCH_FAILED" as const, message: "Could not reach Withings" },
    });
  }

  const measData = (await measResponse.json()) as {
    status?: number;
    body?: {
      measuregrps?: {
        grpid?: number;
        attrib?: number;
        date?: number;
        created?: number;
        category?: number;
        measures?: { type: number; value: number; unit: number }[];
      }[];
      updatetime?: number;
    };
  };

  if (measResponse.status !== 200 || measData.status !== 0) {
    logger.info({ msg: "withings_pull_getmeas_error", status: measResponse.status, withingsStatus: measData.status });
    return res.status(502).json({
      ok: false as const,
      error: { code: "MEASURE_FETCH_FAILED" as const, message: "Withings measure request failed" },
    });
  }

  const groups = measData.body?.measuregrps ?? [];
  const rawEventsCol = userCollection(uid, "rawEvents");
  const receivedAt = new Date().toISOString();
  let written = 0;
  let lastUpdate = cursor;

  for (const grp of groups) {
    const dateSec = grp.date ?? grp.created ?? 0;
    lastUpdate = Math.max(lastUpdate, dateSec);
    const observedAt = new Date(dateSec * 1000).toISOString();

    for (const m of grp.measures ?? []) {
      if (m.type !== 1) continue;
      const weightKg = m.unit === 0 ? m.value / 1000 : m.value;
      if (!Number.isFinite(weightKg) || weightKg <= 0) continue;

      const grpid = grp.grpid ?? dateSec;
      const idempotencyKey = `${requestIdempotencyKey}_withings_${grpid}_${m.type}_${m.value}_${m.unit}`;
      const docRef = rawEventsCol.doc(idempotencyKey);

      const doc = {
        id: idempotencyKey,
        userId: uid,
        sourceId: "withings",
        sourceType: "device",
        provider: "withings",
        kind: "withings.body_measurement" as const,
        receivedAt,
        observedAt,
        occurredAt: observedAt,
        schemaVersion: 1 as const,
        payload: {
          time: observedAt,
          timezone: timeZone,
          weightKg,
          bodyFatPercent: null as number | null,
          vendor_payload_revision: String(dateSec),
        },
      };

      const validated = rawEventDocSchema.safeParse(doc);
      if (!validated.success) {
        logger.info({ msg: "withings_pull_validation_failed", idempotencyKey, errors: validated.error.flatten() });
        continue;
      }

      try {
        await docRef.create(validated.data);
        written++;
      } catch {
        const existing = await docRef.get();
        if (existing.exists) {
          written++;
        }
      }
    }
  }

  return res.status(200).json({
    ok: true as const,
    written,
    cursor: measData.body?.updatetime ?? lastUpdate,
  });
});
