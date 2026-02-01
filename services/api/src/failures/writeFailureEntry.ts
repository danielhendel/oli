// services/api/src/failures/writeFailureEntry.ts

import { FieldValue } from "firebase-admin/firestore";
import crypto from "node:crypto";
import { userCollection } from "../db";

export type ApiFailureEntryType =
  | "INGEST_REJECTED"
  | "RAW_EVENT_INVALID"
  | "NORMALIZATION_FAILED"
  | "CANONICAL_WRITE_CONFLICT";

export type WriteFailureEntryInput = {
  uid: string;

  /**
   * Deterministic doc id strongly preferred (e.g. ingest_{idempotencyKey}).
   * If omitted, we generate a UUID.
   */
  failureId?: string;

  type: ApiFailureEntryType;
  code: string;
  message: string;

  /**
   * yyyy-mm-dd day key used for listing.
   * If omitted, derived as:
   * - observedAt + timeZone when available
   * - else UTC day.
   */
  day?: string;

  observedAt?: string | null;
  timeZone?: string | null;

  rawEventId?: string;
  rawEventPath?: string;

  /**
   * Optional safe details only (no payload, no request body).
   */
  details?: Record<string, unknown> | null;
};

const utcDayNow = (): string => new Date().toISOString().slice(0, 10);

const canonicalDayKeyFromObservedAt = (observedAtIso: string, timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone });
  return formatter.format(new Date(observedAtIso));
};

const sanitizeFailureDetails = (details: Record<string, unknown> | null | undefined): Record<string, unknown> | null => {
  if (!details) return null;

  const blockedKeys = new Set([
    "payload",
    "raw",
    "rawPayload",
    "vendorPayload",
    "body",
    "request",
    "response",
    "headers",
    "authorization",
    "cookie",
    "token",
    "tokens",
    "accessToken",
    "refreshToken",
  ]);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (blockedKeys.has(k)) continue;
    const lk = k.toLowerCase();
    if (
      lk.includes("payload") ||
      lk.includes("token") ||
      lk.includes("secret") ||
      lk.includes("authorization") ||
      lk.includes("cookie")
    ) {
      continue;
    }

    if (typeof v === "string") out[k] = v.length > 500 ? `${v.slice(0, 500)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 25);
    else if (typeof v === "object") out[k] = "[redacted-object]";
    else out[k] = String(v);
  }

  return out;
};

/**
 * Step 8 — Write Failure Memory entry (API runtime).
 *
 * - Best-effort (callers may ignore failures).
 * - Idempotent: create() is used; ALREADY_EXISTS is treated as success.
 * - Payload-safe: details scrubbed; never stores request body/payload.
 */
export async function writeFailureEntry(input: WriteFailureEntryInput): Promise<void> {
  const failureId = input.failureId ?? `failure_${crypto.randomUUID()}`;
  const ref = userCollection(input.uid, "failures").doc(failureId);

  const derivedDay =
    input.day ??
    (input.timeZone && input.observedAt
      ? (() => {
          try {
            return canonicalDayKeyFromObservedAt(input.observedAt, input.timeZone);
          } catch {
            return utcDayNow();
          }
        })()
      : utcDayNow());

  const doc = {
    type: input.type,
    userId: input.uid,
    code: input.code,
    message: input.message,
    day: derivedDay,
    ...(input.timeZone ? { timeZone: input.timeZone } : {}),
    ...(input.observedAt ? { observedAt: input.observedAt } : {}),
    ...(input.rawEventId ? { rawEventId: input.rawEventId } : {}),
    ...(input.rawEventPath ? { rawEventPath: input.rawEventPath } : {}),
    ...(input.details ? { details: sanitizeFailureDetails(input.details) } : {}),
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    await ref.create(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ALREADY_EXISTS") || msg.includes("already exists")) return;
    throw err;
  }
}
