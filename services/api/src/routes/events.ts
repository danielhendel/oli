// services/api/src/routes/events.ts
import { Router, type Response } from "express";

import { rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";
import { userCollection } from "../db";

const router = Router();

/**
 * Prefer header-based idempotency. Allow middleware injection if present.
 * This preserves your current behavior while making the contract explicit:
 * - Idempotency-Key (or X-Idempotency-Key) is the canonical interface.
 */
const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  if (fromHeader) return fromHeader;

  // Preserve compatibility with any upstream middleware that sets req.idempotencyKey
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  return fromMiddleware ?? undefined;
};

type StableApiErrorCode = "TIMEZONE_REQUIRED" | "TIMEZONE_INVALID" | "MISSING_IDEMPOTENCY_KEY" | "INGEST_WRITE_FAILED";

const badRequest = (res: Response, code: StableApiErrorCode, message: string) =>
  res.status(400).json({
    ok: false as const,
    error: {
      code,
      message,
    },
  });

const internalError = (res: Response, code: StableApiErrorCode, message: string) =>
  res.status(500).json({
    ok: false as const,
    error: {
      code,
      message,
    },
  });

/**
 * Extract + validate an IANA timezone string.
 * Fail-closed: no silent UTC fallback.
 */
const requireValidTimeZone = (reqBody: unknown): string | undefined => {
  const tz = (reqBody as { timeZone?: unknown } | null | undefined)?.timeZone;
  const timeZone = typeof tz === "string" ? tz : undefined;

  if (!timeZone) return undefined;

  // Validate IANA timezone via Intl. Throws RangeError on invalid tz.
  // We do NOT rely on try/catch in Date parsing.
  new Intl.DateTimeFormat("en-US", { timeZone });

  return timeZone;
};

/**
 * Single source-of-truth dayKey algorithm (must match canonical normalization):
 * Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(observedAt))
 */
const canonicalDayKeyFromObservedAt = (observedAtIso: string, timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone });
  return formatter.format(new Date(observedAtIso));
};

/**
 * Canonical ingestion gateway (AUTHENTICATED)
 *
 * - Validates body (ingestRawEventSchema)
 * - Canonicalizes timestamps
 * - Requires valid timeZone (fail closed; no UTC fallback)
 * - Computes dayKey using canonical algorithm (Intl.DateTimeFormat("en-CA", { timeZone }))
 * - Validates canonical RawEvent doc with @oli/contracts (rawEventDocSchema)
 * - Writes RawEvent to: /users/{uid}/rawEvents/{rawEventId}
 * - Firestore trigger normalizes → pipeline
 *
 * ✅ Mounted at: POST /ingest   (see services/api/src/index.ts)
 *
 * IDENTITY + INTEGRITY:
 * - Requires Idempotency-Key (or X-Idempotency-Key)
 * - Uses that key as the Firestore doc id to guarantee idempotency
 */
router.post("/", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }

  // Contract-first: timeZone is authoritative + required.
  // We validate directly off req.body to fail closed even if schema changes lag behind.
  let timeZone: string | undefined;
  try {
    timeZone = requireValidTimeZone(req.body);
  } catch {
    return badRequest(res, "TIMEZONE_INVALID", "Invalid timeZone (must be an IANA timezone, e.g. America/New_York)");
  }
  if (!timeZone) {
    return badRequest(res, "TIMEZONE_REQUIRED", "timeZone is required (IANA timezone, e.g. America/New_York)");
  }

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event",
      details: parsed.error.flatten(),
    });
  }

  const body: IngestRawEventBody = parsed.data;

  // Canonicalize timestamps (observedAt preferred; occurredAt can be exact or range)
  const occurredAtRaw = body.occurredAt ?? body.observedAt;
  if (!occurredAtRaw) {
    return res.status(400).json({ ok: false as const, error: "Missing observedAt/occurredAt" });
  }

  const observedAt: string =
    typeof occurredAtRaw === "string"
      ? occurredAtRaw
      : occurredAtRaw.start;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY" as const,
        message: "Idempotency-Key header is required for ingestion",
      },
    });
  }

  const receivedAt = new Date().toISOString();

  // ✅ Must match canonical dayKey semantics (use observedAt for day derivation)
  const day = canonicalDayKeyFromObservedAt(observedAt, timeZone);

  // Phase 1: gateway currently represents manual ingestion
  const sourceType = "manual" as const;
  const schemaVersion = 1 as const;

  // ✅ MUST be user-scoped
  const rawEventsCol = userCollection(uid, "rawEvents");

  // ✅ Mandatory idempotency: doc id is deterministic
  const docRef = rawEventsCol.doc(idempotencyKey);
  const rawEventId = docRef.id;

  const doc: Record<string, unknown> = {
    id: rawEventId,
    userId: uid,

    sourceId: body.sourceId ?? "manual",
    sourceType,

    provider: body.provider,
    kind: body.kind,

    receivedAt,
    observedAt,

    payload: body.payload,

    schemaVersion,
  };

  // Phase 2 — preserve occurredAt (exact or range), recordedAt, provenance, uncertainty
  if (typeof occurredAtRaw === "object" && occurredAtRaw !== null) {
    doc.occurredAt = occurredAtRaw;
  } else if (typeof occurredAtRaw === "string") {
    doc.occurredAt = occurredAtRaw;
  }
  if (body.recordedAt) doc.recordedAt = body.recordedAt;
  if (body.provenance) doc.provenance = body.provenance;
  if (body.uncertaintyState) doc.uncertaintyState = body.uncertaintyState;
  if (body.contentUnknown === true) doc.contentUnknown = true;

  const validated = rawEventDocSchema.safeParse(doc);
  if (!validated.success) {
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
    // If create() failed because the doc already exists, treat as an idempotent replay.
    // We avoid assuming error codes and instead check existence (fail closed).
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
      // Firestore read failed — fall through to internal error.
    }

    return internalError(res, "INGEST_WRITE_FAILED", "Failed to write RawEvent");
  }
});

export default router;