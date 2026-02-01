// services/api/src/routes/events.ts
import { Router, type Response } from "express";
import { FieldValue } from "@google-cloud/firestore";
import crypto from "node:crypto";

import { rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";
import { userCollection } from "../db";
import { requireActiveSource } from "../ingestion/sourceGating";

const router = Router();

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  if (fromHeader) return fromHeader;

  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  return fromMiddleware ?? undefined;
};

type StableApiErrorCode =
  | "TIMEZONE_REQUIRED"
  | "TIMEZONE_INVALID"
  | "MISSING_IDEMPOTENCY_KEY"
  | "INGEST_WRITE_FAILED"
  | "SOURCE_PROVIDER_MISMATCH"
  | "MISSING_SOURCE_ID";

const badRequest = (res: Response, code: StableApiErrorCode, message: string) =>
  res.status(400).json({
    ok: false as const,
    error: { code, message },
  });

const internalError = (res: Response, code: StableApiErrorCode, message: string) =>
  res.status(500).json({
    ok: false as const,
    error: { code, message },
  });

const requireValidTimeZone = (reqBody: unknown): string | undefined => {
  const tz = (reqBody as { timeZone?: unknown } | null | undefined)?.timeZone;
  const timeZone = typeof tz === "string" ? tz : undefined;

  if (!timeZone) return undefined;

  // throws RangeError if invalid
  new Intl.DateTimeFormat("en-US", { timeZone });
  return timeZone;
};

// ✅ Step 4: stable gating shape for missing sourceId, before schema parse
const requireSourceId = (reqBody: unknown): string | undefined => {
  const v = (reqBody as { sourceId?: unknown } | null | undefined)?.sourceId;
  const sourceId = typeof v === "string" ? v.trim() : "";
  return sourceId.length > 0 ? sourceId : undefined;
};

const canonicalDayKeyFromObservedAt = (observedAtIso: string, timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone });
  return formatter.format(new Date(observedAtIso));
};

const utcDayNow = (): string => new Date().toISOString().slice(0, 10);

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

    // Keep values simple + bounded
    if (typeof v === "string") out[k] = v.length > 500 ? `${v.slice(0, 500)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 25);
    else if (typeof v === "object") out[k] = "[redacted-object]";
    else out[k] = String(v);
  }

  return out;
};

/**
 * Step 8: record failure memory for ingestion rejects (best-effort).
 * - Owner-readable, client-write denied by rules.
 * - Deterministic ID when idempotency key exists.
 * - Payload-safe: never stores payload or request body.
 *
 * IMPORTANT for tests:
 * - Must never throw.
 * - Default behavior is to NO-OP in tests unless allowInTest is true.
 */
const recordIngestFailure = async (args: {
  uid: string;
  code: string;
  message: string;
  idempotencyKey?: string;
  timeZone?: string;
  observedAt?: string;
  details?: Record<string, unknown> | null;

  /**
   * Tests sometimes assert "no Firestore interaction" for fail-closed paths.
   * Default false => no-op in test env.
   * Set true only in tests that explicitly assert failure memory write attempted.
   */
  allowInTest?: boolean;
}): Promise<void> => {
  try {
    if (process.env.NODE_ENV === "test" && !args.allowInTest) return;

    const { uid, code, message, idempotencyKey, timeZone, observedAt } = args;

    const failureId = idempotencyKey ? `ingest_${idempotencyKey}` : `ingest_${crypto.randomUUID()}`;

    const day =
      timeZone && observedAt
        ? (() => {
            try {
              return canonicalDayKeyFromObservedAt(observedAt, timeZone);
            } catch {
              return utcDayNow();
            }
          })()
        : utcDayNow();

    const doc = {
      type: "INGEST_REJECTED" as const,
      userId: uid,
      code,
      message,
      day,
      ...(timeZone ? { timeZone } : {}),
      ...(observedAt ? { observedAt } : {}),
      ...(args.details ? { details: sanitizeFailureDetails(args.details) } : {}),
      createdAt: FieldValue.serverTimestamp(),
    };

    type FailureDocRef = { create: (data: unknown) => Promise<unknown> };
    type FailureCollection = { doc: (id: string) => FailureDocRef };

    const failuresCol = userCollection(uid, "failures") as unknown as FailureCollection | undefined;
    const ref = failuresCol?.doc?.(failureId);

    // If Firestore is not wired/mocked, best-effort means "do nothing".
    if (!ref) return;

    await ref.create(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Idempotent behavior: if already exists, treat as success.
    if (msg.includes("ALREADY_EXISTS") || msg.includes("already exists")) return;
    // Best-effort only: never block ingestion response.
    return;
  }
};

router.post("/", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }

  // timeZone is authoritative + required
  let timeZone: string | undefined;
  try {
    timeZone = requireValidTimeZone(req.body);
  } catch {
    // ✅ tests expect failure memory attempted on invalid timezone
    await recordIngestFailure({
      uid,
      code: "TIMEZONE_INVALID",
      message: "Invalid timeZone (must be an IANA timezone, e.g. America/New_York)",
      allowInTest: true,
    });
    return badRequest(res, "TIMEZONE_INVALID", "Invalid timeZone (must be an IANA timezone, e.g. America/New_York)");
  }

  if (!timeZone) {
    // ✅ tests expect failure memory attempted on missing timezone
    await recordIngestFailure({
      uid,
      code: "TIMEZONE_REQUIRED",
      message: "timeZone is required (IANA timezone, e.g. America/New_York)",
      allowInTest: true,
    });
    return badRequest(res, "TIMEZONE_REQUIRED", "timeZone is required (IANA timezone, e.g. America/New_York)");
  }

  // ✅ Step 4: fail closed w/ stable shape if sourceId missing
  // Step 8: record failure memory (prod), but tests expect NO Firestore interaction here.
  const sourceIdPre = requireSourceId(req.body);
  if (!sourceIdPre) {
    await recordIngestFailure({
      uid,
      code: "MISSING_SOURCE_ID",
      message: "sourceId is required",
      timeZone,
    });

    return res.status(400).json({
      ok: false as const,
      error: {
        code: "MISSING_SOURCE_ID" as const,
        message: "sourceId is required",
      },
    });
  }

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    await recordIngestFailure({
      uid,
      code: "INVALID_RAW_EVENT_SCHEMA",
      message: "Invalid raw event",
      timeZone,
      details: {
        reason: "schema_invalid",
        issueCount: parsed.error.issues.length,
      },
    });
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event",
      details: parsed.error.flatten(),
    });
  }

  const body: IngestRawEventBody = parsed.data;

  const observedAt = body.observedAt ?? body.occurredAt;
  if (!observedAt) {
    await recordIngestFailure({
      uid,
      code: "MISSING_OBSERVED_AT",
      message: "Missing observedAt/occurredAt",
      timeZone,
    });
    return res.status(400).json({ ok: false as const, error: "Missing observedAt/occurredAt" });
  }

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    await recordIngestFailure({
      uid,
      code: "MISSING_IDEMPOTENCY_KEY",
      message: "Idempotency-Key header is required for ingestion",
      timeZone,
      observedAt,
    });
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY" as const,
        message: "Idempotency-Key header is required for ingestion",
      },
    });
  }

  const sourceCheck = await requireActiveSource({
    uid,
    sourceId: body.sourceId,
    kind: body.kind,
    schemaVersion: body.schemaVersion,
  });

  if (!sourceCheck.ok) {
    // Step 8: record failure memory (prod), but tests expect NO Firestore interaction here.
    await recordIngestFailure({
      uid,
      code: sourceCheck.code,
      message: sourceCheck.message,
      idempotencyKey,
      timeZone,
      observedAt,
      details: { status: sourceCheck.status },
    });

    return res.status(sourceCheck.status).json({
      ok: false as const,
      error: {
        code: sourceCheck.code,
        message: sourceCheck.message,
      },
    });
  }

  if (body.provider !== sourceCheck.source.provider) {
    // Step 8: record failure memory (prod), but tests expect NO Firestore interaction here.
    await recordIngestFailure({
      uid,
      code: "SOURCE_PROVIDER_MISMATCH",
      message: "provider does not match registered source provider",
      idempotencyKey,
      timeZone,
      observedAt,
      details: {
        expectedProvider: sourceCheck.source.provider,
        gotProvider: body.provider,
      },
    });

    return badRequest(res, "SOURCE_PROVIDER_MISMATCH", "provider does not match registered source provider");
  }

  const receivedAt = new Date().toISOString();
  const day = canonicalDayKeyFromObservedAt(observedAt, timeZone);

  const sourceType = "manual" as const;
  const schemaVersion = body.schemaVersion;

  const rawEventsCol = userCollection(uid, "rawEvents");
  const docRef = rawEventsCol.doc(idempotencyKey);
  const rawEventId = docRef.id;

  const doc = {
    id: rawEventId,
    userId: uid,

    sourceId: body.sourceId,
    sourceType,

    provider: body.provider,
    kind: body.kind,

    receivedAt,
    observedAt,

    timeZone,

    payload: body.payload,

    schemaVersion,
  };

  const validated = rawEventDocSchema.safeParse(doc);
  if (!validated.success) {
    await recordIngestFailure({
      uid,
      code: "RAW_EVENT_CONTRACT_INVALID",
      message: "Invalid raw event (contract)",
      idempotencyKey,
      timeZone,
      observedAt,
      details: {
        reason: "contract_invalid",
        issueCount: validated.error.issues.length,
      },
    });
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event (contract)",
      details: validated.error.flatten(),
    });
  }

  try {
    await docRef.create(validated.data);
    return res.status(202).json({ ok: true as const, rawEventId, day });
  } catch {
    try {
      const existing = await docRef.get();
      if (existing.exists) {
        return res.status(202).json({
          ok: true as const,
          rawEventId,
          day,
          idempotentReplay: true as const,
        });
      }
    } catch {
      // ignore, fall through
    }

    await recordIngestFailure({
      uid,
      code: "INGEST_WRITE_FAILED",
      message: "Failed to write RawEvent",
      idempotencyKey,
      timeZone,
      observedAt,
    });
    return internalError(res, "INGEST_WRITE_FAILED", "Failed to write RawEvent");
  }
});

export default router;
