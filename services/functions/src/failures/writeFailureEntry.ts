// services/functions/src/failures/writeFailureEntry.ts

import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { failureDoc, type FailureEntry, type FailureEntryType } from "../db/collections";

/**
 * Step 8 — Failure Memory writer (Functions runtime)
 *
 * Goals:
 * - Backend-only, payload-safe failure entries.
 * - Idempotent: safe under retries and replays.
 * - Never throws to caller by default (callers may catch).
 *
 * Collection:
 *   /users/{uid}/failures/{failureId}
 */
export type WriteFailureEntryInput = {
  userId: string;
  failureId: string;

  type: FailureEntryType;
  code: string;
  message: string;

  /**
   * yyyy-mm-dd day key for longitudinal listing.
   * If omitted, derived as:
   * - observedAt + timeZone when both present and valid
   * - else UTC day from now.
   */
  day?: string;

  /** Optional time anchors for better day derivation. */
  observedAt?: unknown | null;
  timeZone?: string | null;

  /** Optional traceability back to RawEvent. */
  rawEventId?: string;
  rawEventPath?: string;

  /** Optional safe details (must never include raw payload). */
  details?: Record<string, unknown> | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Very defensive payload scrubber:
 * - Drops any key that looks like it could contain raw payload or sensitive blobs.
 * - Truncates large strings/arrays to keep Firestore doc safe.
 * - Ensures only JSON-like primitives remain.
 */
export function sanitizeFailureDetails(
  details: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
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
    "tokens",
    "token",
    "accessToken",
    "refreshToken",
  ]);

  const scrub = (input: unknown, depth: number): unknown => {
    if (depth > 4) return "[truncated]";
    if (input === null) return null;

    // ✅ Use direct typeof checks so TS narrows `input` correctly.
    if (typeof input === "string") {
      return input.length > 500 ? `${input.slice(0, 500)}…` : input;
    }

    if (typeof input === "number" || typeof input === "boolean") return input;

    if (Array.isArray(input)) {
      const limited = input.slice(0, 25);
      return limited.map((x) => scrub(x, depth + 1));
    }

    if (isRecord(input)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        if (blockedKeys.has(k)) continue;

        // If key smells like payload/secrets, drop it.
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

        out[k] = scrub(v, depth + 1);
      }
      return out;
    }

    // Unknown / non-JSON types -> string tag only.
    return String(input);
  };

  const scrubbed = scrub(details, 0);
  return isRecord(scrubbed) ? scrubbed : null;
}

function coerceIsoDateDayUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tryDeriveDayFromObservedAtAndTimeZone(observedAt: unknown, timeZone: string): string | null {
  // observedAt may be ISO string, number ms, or other — be defensive.
  let dt: Date | null = null;

  if (typeof observedAt === "string") {
    const parsed = new Date(observedAt);
    if (!Number.isNaN(parsed.getTime())) dt = parsed;
  } else if (typeof observedAt === "number") {
    const parsed = new Date(observedAt);
    if (!Number.isNaN(parsed.getTime())) dt = parsed;
  } else if (observedAt instanceof Date) {
    if (!Number.isNaN(observedAt.getTime())) dt = observedAt;
  }

  if (!dt) return null;

  try {
    // Step 1 invariant: use Intl.DateTimeFormat("en-CA", { timeZone })
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone });
    return fmt.format(dt);
  } catch {
    return null;
  }
}

/**
 * Writes a FailureEntry at a deterministic doc id.
 * Idempotent: if doc already exists, does nothing.
 */
export async function writeFailureEntry(input: WriteFailureEntryInput): Promise<void> {
  const { userId, failureId, type, code, message, rawEventId, rawEventPath, observedAt, timeZone } = input;

  const ref = failureDoc(userId, failureId);

  // Derive day:
  const day =
    input.day ??
    (timeZone && observedAt != null
      ? tryDeriveDayFromObservedAtAndTimeZone(observedAt, timeZone) ?? coerceIsoDateDayUTC(new Date())
      : coerceIsoDateDayUTC(new Date()));

  const entry: FailureEntry = {
    type,
    userId,
    code,
    message,
    day,
    ...(timeZone ? { timeZone } : {}),
    ...(observedAt != null ? { observedAt } : {}),
    ...(rawEventId ? { rawEventId } : {}),
    ...(rawEventPath ? { rawEventPath } : {}),
    details: sanitizeFailureDetails(input.details),
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    // Idempotent create: if already exists, skip.
    // Firestore create() fails if exists.
    await ref.create(entry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // If it already exists, treat as success (idempotent).
    if (msg.includes("ALREADY_EXISTS") || msg.includes("already exists")) return;

    // Otherwise rethrow so caller can log and continue.
    logger.error("writeFailureEntry failed", {
      userId,
      failureId,
      type,
      code,
      error: msg,
    });
    throw err;
  }
}
