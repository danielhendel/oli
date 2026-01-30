// services/api/src/routes/events.ts
import { Router, type Response } from "express";

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

const requireValidTimeZone = (reqBody: unknown): string | undefined => {
  const tz = (reqBody as { timeZone?: unknown } | null | undefined)?.timeZone;
  const timeZone = typeof tz === "string" ? tz : undefined;

  if (!timeZone) return undefined;

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
    return badRequest(res, "TIMEZONE_INVALID", "Invalid timeZone (must be an IANA timezone, e.g. America/New_York)");
  }
  if (!timeZone) {
    return badRequest(res, "TIMEZONE_REQUIRED", "timeZone is required (IANA timezone, e.g. America/New_York)");
  }

  // ✅ Step 4: fail closed w/ stable shape if sourceId missing
  const sourceIdPre = requireSourceId(req.body);
  if (!sourceIdPre) {
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
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event",
      details: parsed.error.flatten(),
    });
  }

  const body: IngestRawEventBody = parsed.data;

  const observedAt = body.observedAt ?? body.occurredAt;
  if (!observedAt) {
    return res.status(400).json({ ok: false as const, error: "Missing observedAt/occurredAt" });
  }

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

  const sourceCheck = await requireActiveSource({
    uid,
    sourceId: body.sourceId,
    kind: body.kind,
    schemaVersion: body.schemaVersion,
  });

  if (!sourceCheck.ok) {
    return res.status(sourceCheck.status).json({
      ok: false as const,
      error: {
        code: sourceCheck.code,
        message: sourceCheck.message,
      },
    });
  }

  if (body.provider !== sourceCheck.source.provider) {
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

    return internalError(res, "INGEST_WRITE_FAILED", "Failed to write RawEvent");
  }
});

export default router;
