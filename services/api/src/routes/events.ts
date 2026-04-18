// services/api/src/routes/events.ts
import { Router, type Response } from "express";

import { localCalendarDayKeyFromIsoInTimeZone, rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../middleware/auth";
import type { RequestWithRid } from "../lib/logger";
import { writeFailure } from "../lib/writeFailure";
import { mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded } from "../lib/mergeAppleHealthWorkoutDistance";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";
import { userCollection } from "../db";

const router = Router();

/**
 * Request id from middleware (same source as other routes).
 */
function getRid(req: AuthedRequest): string {
  return (req as RequestWithRid).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

/** Day key YYYY-MM-DD in UTC (for failure entries when event day is not available). */
function dayUtcNow(): string {
  return new Date().toISOString().slice(0, 10);
}

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
 * Ingest `day` for non–Apple-steps events: local calendar key from envelope `observedAt` + `timeZone`.
 * Apple Health `steps` uses {@link localCalendarDayKeyFromIsoInTimeZone} on `payload.start` + `payload.timezone` only.
 */
const canonicalDayKeyFromObservedAt = (observedAtIso: string, timeZone: string): string => {
  const key = localCalendarDayKeyFromIsoInTimeZone(observedAtIso, timeZone);
  if (key) return key;
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
 *
 * CONSTITUTION: All responses include requestId in JSON body; all failure paths write FailureEntry.
 */
router.post("/", async (req: AuthedRequest, res: Response) => {
  const requestId = getRid(req);
  const uid = req.uid;

  if (!uid) {
    try {
      await writeFailure({
        userId: "unknown",
        source: "ingestion",
        stage: "ingest",
        reasonCode: "UNAUTHORIZED",
        message: "Unauthorized",
        day: dayUtcNow(),
        requestId,
        details: {},
      });
    } catch {
      // do not throw; response still returned
    }
    return res.status(401).json({
      ok: false as const,
      error: "Unauthorized",
      requestId,
    });
  }

  // Contract-first: timeZone is authoritative + required.
  // We validate directly off req.body to fail closed even if schema changes lag behind.
  let timeZone: string | undefined;
  try {
    timeZone = requireValidTimeZone(req.body);
  } catch {
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "TIMEZONE_INVALID",
        message: "Invalid timeZone (must be an IANA timezone, e.g. America/New_York)",
        day: dayUtcNow(),
        requestId,
        details: {},
      });
    } catch {
      // do not throw
    }
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "TIMEZONE_INVALID" as const,
        message: "Invalid timeZone (must be an IANA timezone, e.g. America/New_York)",
      },
      requestId,
    });
  }
  if (!timeZone) {
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "TIMEZONE_REQUIRED",
        message: "timeZone is required (IANA timezone, e.g. America/New_York)",
        day: dayUtcNow(),
        requestId,
        details: {},
      });
    } catch {
      // do not throw
    }
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "TIMEZONE_REQUIRED" as const,
        message: "timeZone is required (IANA timezone, e.g. America/New_York)",
      },
      requestId,
    });
  }

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "INVALID_RAW_EVENT",
        message: "Invalid raw event",
        day: dayUtcNow(),
        requestId,
        details: { validation: details },
      });
    } catch {
      // do not throw
    }
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event",
      details,
      requestId,
    });
  }

  const body: IngestRawEventBody = parsed.data;

  // Canonicalize timestamps: `observedAt` wins over `occurredAt` when both are present (explicit envelope).
  // `occurredAt` may still be a string or { start, end } range for legacy clients.
  const occurredAtRaw = body.observedAt ?? body.occurredAt;
  if (!occurredAtRaw) {
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "MISSING_OBSERVED_AT",
        message: "Missing observedAt/occurredAt",
        day: dayUtcNow(),
        requestId,
        details: {},
      });
    } catch {
      // do not throw
    }
    return res.status(400).json({
      ok: false as const,
      error: "Missing observedAt/occurredAt",
      requestId,
    });
  }

  const observedAt: string =
    typeof occurredAtRaw === "string"
      ? occurredAtRaw
      : occurredAtRaw.start;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "MISSING_IDEMPOTENCY_KEY",
        message: "Idempotency-Key header is required for ingestion",
        day: dayUtcNow(),
        requestId,
        details: {},
      });
    } catch {
      // do not throw
    }
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY" as const,
        message: "Idempotency-Key header is required for ingestion",
      },
      requestId,
    });
  }

  const receivedAt = new Date().toISOString();

  let day: string;
  if (body.provider === "apple_health" && body.kind === "steps") {
    const p = body.payload;
    if (typeof p !== "object" || p === null || Array.isArray(p)) {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest",
          reasonCode: "STEPS_PAYLOAD_INVALID",
          message: "apple_health steps requires a JSON object payload with start, end, timezone, steps",
          day: dayUtcNow(),
          requestId,
          details: {},
        });
      } catch {
        // do not throw
      }
      return res.status(400).json({
        ok: false as const,
        error: {
          code: "STEPS_PAYLOAD_INVALID" as const,
          message: "apple_health steps requires a JSON object payload with start, end, timezone, steps",
        },
        requestId,
      });
    }
    const pr = p as Record<string, unknown>;
    const pStart = pr["start"];
    const pTz = pr["timezone"];
    if (typeof pStart !== "string" || typeof pTz !== "string") {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest",
          reasonCode: "STEPS_PAYLOAD_INVALID",
          message: "apple_health steps payload must include string start and timezone",
          day: dayUtcNow(),
          requestId,
          details: {},
        });
      } catch {
        // do not throw
      }
      return res.status(400).json({
        ok: false as const,
        error: {
          code: "STEPS_PAYLOAD_INVALID" as const,
          message: "apple_health steps payload must include string start and timezone",
        },
        requestId,
      });
    }
    if (pTz !== timeZone) {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest",
          reasonCode: "STEPS_PAYLOAD_TIMEZONE_MISMATCH",
          message:
            "steps payload.timezone must match top-level timeZone (single IANA source for ingest + normalization)",
          day: dayUtcNow(),
          requestId,
          details: { payloadTimezone: pTz, envelopeTimeZone: timeZone },
        });
      } catch {
        // do not throw
      }
      return res.status(400).json({
        ok: false as const,
        error: {
          code: "STEPS_PAYLOAD_TIMEZONE_MISMATCH" as const,
          message:
            "steps payload.timezone must match top-level timeZone (single IANA source for ingest + normalization)",
        },
        requestId,
      });
    }
    const payloadDay = localCalendarDayKeyFromIsoInTimeZone(pStart, pTz);
    if (!payloadDay) {
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest",
          reasonCode: "STEPS_PAYLOAD_DAY_INVALID",
          message: "Could not derive local calendar day from steps payload.start and payload.timezone",
          day: dayUtcNow(),
          requestId,
          details: { payloadStart: pStart, payloadTimezone: pTz },
        });
      } catch {
        // do not throw
      }
      return res.status(400).json({
        ok: false as const,
        error: {
          code: "STEPS_PAYLOAD_DAY_INVALID" as const,
          message: "Could not derive local calendar day from steps payload.start and payload.timezone",
        },
        requestId,
      });
    }
    day = payloadDay;
  } else {
    day = canonicalDayKeyFromObservedAt(observedAt, timeZone);
  }

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
  if (body.correctionOfRawEventId) {
    doc.correctionOfRawEventId = body.correctionOfRawEventId;
    doc.provenance = doc.provenance ?? "correction";
  }

  const validated = rawEventDocSchema.safeParse(doc);
  if (!validated.success) {
    const details = validated.error.flatten();
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "INVALID_RAW_EVENT_CONTRACT",
        message: "Invalid raw event (contract)",
        day,
        requestId,
        details: { validation: details },
      });
    } catch {
      // do not throw
    }
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event (contract)",
      details,
      requestId,
    });
  }

  try {
    await docRef.create(validated.data);
    return res.status(202).json({ ok: true as const, rawEventId, day, requestId });
  } catch {
    // If create() failed because the doc already exists, treat as an idempotent replay.
    // We avoid assuming error codes and instead check existence (fail closed).
    try {
      const existing = await docRef.get();
      if (existing.exists) {
        const enriched = await mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded({
          body,
          existingData: existing.data(),
          update: (payload) => docRef.update({ payload }),
        });
        // Steps replays use the same raw doc id; `onDocumentCreated` does not re-fire.
        // Apple Health sends an updated cumulative total for the same calendar day under the
        // same idempotency key — we must persist the new payload, not only bump receivedAt,
        // or Firestore stays on an early partial (e.g. 37) while HealthKit shows thousands.
        if (validated.data.kind === "steps") {
          const patch: Record<string, unknown> = {
            payload: validated.data.payload,
            observedAt: validated.data.observedAt,
            receivedAt: validated.data.receivedAt,
          };
          if (validated.data.occurredAt !== undefined) {
            patch.occurredAt = validated.data.occurredAt;
          }
          await docRef.update(patch);
        }
        return res.status(202).json({
          ok: true as const,
          rawEventId,
          day,
          idempotentReplay: true as const,
          ...(enriched ? { payloadEnriched: true as const } : {}),
          requestId,
        });
      }
    } catch {
      // Firestore read failed — fall through to internal error.
    }

    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest",
        reasonCode: "INGEST_WRITE_FAILED",
        message: "Failed to write RawEvent",
        day,
        rawEventId,
        requestId,
        details: {},
      });
    } catch {
      // do not throw
    }
    return res.status(500).json({
      ok: false as const,
      error: {
        code: "INGEST_WRITE_FAILED" as const,
        message: "Failed to write RawEvent",
      },
      requestId,
    });
  }
});

export default router;
