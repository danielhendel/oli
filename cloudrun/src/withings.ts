/**
 * Purpose: Handle Withings OAuth + webhook ingestion.
 * Inputs: OAuth redirect (code, state), Webhook POST (JSON body).
 * Side-effects: Firestore write to /users/{uid}/events/{eventId}.
 * Errors: Returns structured JSON instead of throwing.
 */

import type { Request, Response } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Build the OAuth start URL for Withings.
 */
export function withingsStartURL(baseUrl: string, _uid: string, state: string): string {
  const redirect = encodeURIComponent(`${baseUrl}/oauth/withings/callback`);
  const clientId = process.env.WITHINGS_CLIENT_ID ?? "local";
  return `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&scope=user.metrics&state=${encodeURIComponent(
    state
  )}`;
}

/**
 * OAuth callback — TODO: exchange code for tokens, store under /users/{uid}/integrations/withings
 */
export async function handleWithingsCallback(_req: Request, res: Response): Promise<Response> {
  return res.status(200).send("OK");
}

// ---------- helpers ----------
function hash32(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function ymdFromEpochSeconds(sec?: number): string {
  const d = typeof sec === "number" ? new Date(sec * 1000) : new Date();
  return d.toISOString().slice(0, 10);
}

// Minimal, forward-compatible shape (passthrough keeps unknown fields)
const WebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
    internal_id: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
    type: z.string().optional(),
    date: z.number().optional(), // many Withings payloads use epoch seconds
    timestamp: z.number().optional(), // sometimes used instead of date
    body: z.unknown().optional(), // some payloads nest under body
  })
  .passthrough();

type WithingsWebhook = z.infer<typeof WebhookSchema>;

// ---------- webhook ----------
/**
 * Webhook handler for Withings.
 * NOTE: Currently Withings sends plain JSON. If they introduce signature headers,
 * add HMAC verification here (same style as Oura).
 * Mount upstream with: app.post("/webhooks/withings", express.json(), handleWithingsWebhook)
 */
export async function handleWithingsWebhook(req: Request, res: Response): Promise<Response> {
  const uid = String(req.query.uid ?? "");
  if (!uid) return res.status(400).json({ ok: false, error: "missing_uid" });

  // Parse & validate body
  const parsedBody = WebhookSchema.safeParse(req.body as unknown);
  if (!parsedBody.success) {
    return res.status(400).json({ ok: false, error: "invalid_json", issues: parsedBody.error.issues });
  }
  const payload: WithingsWebhook = parsedBody.data;

  // Deterministic idempotency key (prefer provided IDs, else hash of JSON)
  const rawString = JSON.stringify(payload);
  const providerEventId = payload.id ?? payload.internal_id ?? hash32(rawString);
  const eventId = `withings_${providerEventId}`;

  // Choose the best available timestamp field
  const epochSec = typeof payload.date === "number" ? payload.date : payload.timestamp;
  const ymd = ymdFromEpochSeconds(epochSec);

  const eventDoc = {
    type: String(payload.type ?? "measurement"),
    ymd,
    payload, // store full validated payload for downstream mappers
    meta: {
      source: "import:withings",
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
      // Idempotent re-send: treat as success
      return res.status(200).json({ ok: true, eventId, dedup: true });
    }
    return res.status(500).json({ ok: false, error: "write_failed", detail: message });
  }
}
