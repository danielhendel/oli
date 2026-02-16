/**
 * Purpose: Handle Oura OAuth + webhook ingestion.
 * Inputs: OAuth redirect (code, state), Webhook POST (raw body, signature).
 * Side-effects: Firestore writes (token storage, events).
 * Errors: Returns structured JSON.
 */

import type { Request, Response } from "express";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { verifyState } from "./state.js";

// ---------- helpers ----------
function hash32(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
function ymdFromIso(iso: string): string {
  return iso.slice(0, 10); // ISO in UTC → safe Y-M-D slice
}
function verifySignature(raw: Buffer, secret: string, headerSig?: string | string[]): boolean {
  if (!secret || !headerSig || typeof headerSig !== "string") return false;
  const computed = createHmac("sha256", secret).update(raw).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(headerSig), Buffer.from(computed));
  } catch {
    return false;
  }
}

// Minimal shapes for webhook parsing (allow passthrough for forward-compat)
const WebhookSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    event_type: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
type OuraWebhook = z.infer<typeof WebhookSchema>;

function getStartIso(obj: OuraWebhook): string | undefined {
  const p = obj.payload as { start_time?: string } | undefined;
  const d = obj.data as { start_time?: string } | undefined;
  if (p && typeof p.start_time === "string") return p.start_time;
  if (d && typeof d.start_time === "string") return d.start_time;
  return undefined;
}

// ---------- OAuth ----------
export function ouraStartURL(baseUrl: string, _uid: string, state: string): string {
  const redirect = encodeURIComponent(`${baseUrl}/oauth/oura/callback`);
  const clientId = process.env.OURA_CLIENT_ID ?? "local";
  const scope = encodeURIComponent("daily heartrate workout sleep activity");
  return `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&scope=${scope}&state=${encodeURIComponent(
    state
  )}&prompt=consent`;
}

/**
 * OAuth callback — exchanges code for tokens, stores in Firestore.
 */
export async function handleOuraCallback(req: Request, res: Response): Promise<Response> {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code) return res.status(400).send("missing code");
  if (!state) return res.status(400).send("missing state");

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = `${process.env.BACKEND_BASE_URL}/oauth/oura/callback`;
  const stateSecret = process.env.JWT_STATE_SECRET || "dev-secret";

  if (!clientId || !clientSecret) {
    return res.status(500).send("oura oauth misconfigured");
  }

  const v = verifyState(state, { provider: "oura", secret: stateSecret });
  if (!v.ok || !v.uid) {
    return res.status(400).send("invalid state");
  }
  const uid = v.uid;

  try {
    const resp = await fetch("https://api.ouraring.com/oauth/token", {
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

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Oura token exchange failed:", text);
      return res.status(500).send("oura_token_exchange_failed");
    }

    const tokens = (await resp.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const db = getFirestore();
    await db
      .collection("users")
      .doc(uid)
      .collection("integrations")
      .doc("oura")
      .set(
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(200).send("Oura connected! You may close this window.");
  } catch (e) {
    console.error("Oura callback error:", e);
    return res.status(500).send("oura_callback_failed");
  }
}

// ---------- Webhook ----------
export async function handleOuraWebhook(req: Request, res: Response): Promise<Response> {
  const secret = process.env.OURA_WEBHOOK_SECRET || "";
  if (!secret) {
    return res.status(500).json({ ok: false, error: "server_misconfig_missing_secret" });
  }

  const raw = req.body as unknown;
  const sig = req.header("x-oura-signature");
  if (!Buffer.isBuffer(raw)) {
    return res.status(400).json({ ok: false, error: "raw_body_required" });
  }
  if (!verifySignature(raw, secret, sig)) {
    return res.status(401).json({ ok: false, error: "bad_signature" });
  }

  const uid = String(req.query.uid ?? "");
  if (!uid) return res.status(400).json({ ok: false, error: "missing_uid" });

  let parsed: OuraWebhook;
  try {
    parsed = WebhookSchema.parse(JSON.parse(raw.toString("utf8")));
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  const providerEventId =
    parsed.id ??
    (parsed.payload as { id?: string } | undefined)?.id ??
    (parsed.data as { id?: string } | undefined)?.id ??
    hash32(raw.toString("utf8"));

  const eventId = `oura_${providerEventId}`;
  const startIso = getStartIso(parsed) ?? new Date().toISOString();
  const ymd = ymdFromIso(startIso);

  const eventDoc = {
    type: String(parsed.type ?? parsed.event_type ?? "workout"),
    ymd,
    payload: parsed,
    meta: {
      source: "import:oura",
      version: 1,
      createdAt: FieldValue.serverTimestamp(),
      idempotencyKey: providerEventId,
    },
  };

  try {
    const db = getFirestore();
    await db
      .collection("users")
      .doc(uid)
      .collection("events")
      .doc(eventId)
      .set(eventDoc, { merge: false });
    return res.status(200).json({ ok: true, eventId });
  } catch (e) {
    const message = (e as Error).message || "unknown";
    if (message.includes("ALREADY_EXISTS")) {
      return res.status(200).json({ ok: true, eventId, dedup: true });
    }
    return res.status(500).json({ ok: false, error: "write_failed", detail: message });
  }
}
