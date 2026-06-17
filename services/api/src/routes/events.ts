// services/api/src/routes/events.ts
//
// Apple Health workout/body delete + re-sync: tombstones live under users/{uid}/rawEventIngestSuppressions/{id}.
// Every attempted tombstone write logs raw_event_suppression_write_success or raw_event_suppression_write_failed;
// failures propagate (DELETE returns 500 SUPPRESSION_WRITE_FAILED) — never swallowed.
// Optional ingest precheck audit: RAW_EVENT_SUPPRESSION_AUDIT_IDS=comma,separated,ids
import { Router, type Response } from "express";
import { z } from "zod";

import { localCalendarDayKeyFromIsoInTimeZone, rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { logger, type RequestWithRid } from "../lib/logger";
import { writeFailure } from "../lib/writeFailure";
import { mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded } from "../lib/mergeAppleHealthWorkoutDistance";
import { mergeAppleHealthWorkoutPhysiologyIfNeeded } from "../lib/mergeAppleHealthWorkoutPhysiologyIfNeeded";
import {
  isAppleHealthIngestSuppressionKind,
  isRawEventIngestSuppressionDocId,
  shouldLogSuppressionAuditForId,
} from "../lib/rawEventIngestSuppression";
import { finalizeManualNutritionIngestDelete } from "../lib/nutrition/manualNutritionIngestDelete";
import { finalizeManualWeightIngestDelete } from "../lib/body/manualWeightIngestDelete";
import { finalizeManualBodyCompositionIngestDelete } from "../lib/body/manualBodyCompositionIngestDelete";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";
import { userCollection } from "../db";

const router = Router();

/**
 * Writes tombstone at `users/{uid}/rawEventIngestSuppressions/{rawEventId}` (ref.path is that exact path).
 * @returns true if Firestore set() ran for a suppressible Apple Health v2 id; false if id does not use suppression.
 * @throws on Firestore/set failure (caller must surface — never swallow).
 */
async function recordRawEventIngestSuppression(
  uid: string,
  rawEventId: string,
  requestId: string,
  context: "delete_404" | "delete_200",
): Promise<boolean> {
  if (!isRawEventIngestSuppressionDocId(rawEventId)) {
    return false;
  }
  const ref = userCollection(uid, "rawEventIngestSuppressions").doc(rawEventId);
  const firestorePath = ref.path;
  try {
    await ref.set({ suppressedAt: new Date().toISOString() });
    logger.info({
      msg: "raw_event_suppression_write_success",
      rid: requestId,
      uid,
      rawEventId,
      context,
      firestorePath,
    });
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      msg: "raw_event_suppression_write_failed",
      rid: requestId,
      uid,
      rawEventId,
      context,
      firestorePath,
      err: message,
    });
    throw err;
  }
}

async function isRawEventIngestSuppressed(
  uid: string,
  idempotencyKey: string,
  requestId: string,
): Promise<boolean> {
  if (!isRawEventIngestSuppressionDocId(idempotencyKey)) return false;
  const audit = shouldLogSuppressionAuditForId(idempotencyKey);
  try {
    const snap = await userCollection(uid, "rawEventIngestSuppressions").doc(idempotencyKey).get();
    const suppressed = snap.exists;
    if (audit) {
      logger.info({
        msg: "raw_event_suppression_ingest_precheck",
        rid: requestId,
        uid,
        rawEventId: idempotencyKey,
        suppressed,
      });
    }
    return suppressed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      msg: "raw_event_suppression_read_failed",
      rid: requestId,
      uid,
      rawEventId: idempotencyKey,
      err: message,
    });
    return false;
  }
}

/**
 * Request id from middleware (same source as other routes).
 */
function getRid(req: AuthedRequest): string {
  return (req as RequestWithRid).rid ?? (req.header("x-request-id") ?? "unknown").toString();
}

function respondIngestDeleteSuppressionFailure(res: Response, requestId: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({
    ok: false as const,
    error: {
      code: "SUPPRESSION_WRITE_FAILED" as const,
      message: "Could not record deletion tombstone. Retry deletion or contact support.",
      details: { message },
    },
    requestId,
    suppressionWritten: false as const,
  });
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

  if (
    body.provider === "apple_health" &&
    isAppleHealthIngestSuppressionKind(body.kind) &&
    (await isRawEventIngestSuppressed(uid, idempotencyKey, requestId))
  ) {
    if (shouldLogSuppressionAuditForId(idempotencyKey)) {
      logger.info({
        msg: "raw_event_ingest_blocked_by_suppression",
        rid: requestId,
        uid,
        rawEventId: idempotencyKey,
      });
    }
    return res.status(202).json({
      ok: true as const,
      rawEventId: idempotencyKey,
      day,
      idempotentReplay: true as const,
      ingestSuppressed: true as const,
      requestId,
    });
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
        const existingData = existing.data();
        const distanceEnriched = await mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded({
          body,
          existingData,
          update: (payload) => docRef.update({ payload }),
        });

        /**
         * Workout Physiology v1 — Phase B additive merge.
         *
         * On replay, additively patches new physiology fields into the existing raw
         * payload. When a merge happens, we bump `receivedAt` so the workout-aware
         * `onRawEventUpdatedForNormalization` trigger re-runs normalization; the
         * canonical doc then absorbs the fields via the additive supersede gate.
         *
         * Read the FRESH doc snapshot (distance merge above may have just updated
         * `payload`); without this, the physiology merge would compare against
         * stale data and either no-op incorrectly or miss the distance update.
         */
        const existingForPhysiology = distanceEnriched
          ? (await docRef.get()).data()
          : existingData;
        const physiologyEnriched = await mergeAppleHealthWorkoutPhysiologyIfNeeded({
          body,
          existingData: existingForPhysiology,
          update: async (payload) => {
            await docRef.update({
              payload,
              receivedAt: validated.data.receivedAt,
            });
          },
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
          ...(distanceEnriched || physiologyEnriched ? { payloadEnriched: true as const } : {}),
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

const rawEventDeleteParamsSchema = z
  .object({
    rawEventId: z.string().min(1),
  })
  .strip();

/** Providers whose workout raw events users may remove from Oli only (Firestore doc delete; does not mutate Apple Health). Mirrors supported ingest providers for workouts. */
const DELETABLE_WORKOUT_EVENT_PROVIDERS = new Set(["manual", "apple_health"]);

/** Providers whose nutrition raw events users may remove (manual tracked-meal logs only). */
const DELETABLE_NUTRITION_EVENT_PROVIDERS = new Set(["manual"]);

/** Providers whose weight raw events users may remove from Oli (manual + Apple Health hide-from-Oli). */
const DELETABLE_WEIGHT_EVENT_PROVIDERS = new Set(["manual", "apple_health"]);

/** Providers whose body_composition raw events users may hide from Oli (Apple Health only). */
const DELETABLE_BODY_COMPOSITION_EVENT_PROVIDERS = new Set(["apple_health"]);

/**
 * DELETE /ingest/:rawEventId
 *
 * Removes a user-owned RawEvent document (Admin SDK). Clients cannot delete via Firestore rules.
 * Allowed for kinds `workout` / `strength_workout` (manual + apple_health), `nutrition` (manual
 * tracked-meal logs only), `weight` (manual + apple_health hide-from-Oli), and `body_composition`
 * (apple_health hide-from-Oli). Apple Health resurrection suppression applies to workout and body kinds.
 */
router.delete("/:rawEventId", async (req: AuthedRequest, res: Response) => {
  const requestId = getRid(req);
  const urlPath =
    typeof req.originalUrl === "string"
      ? req.originalUrl.split("?")[0] ?? req.originalUrl
      : req.path;
  logger.info({
    msg: "delete_raw_event_enter",
    rid: requestId,
    uid: typeof req.uid === "string" ? req.uid : null,
    path: req.path,
    urlPath,
    rawEventIdParam: req.params.rawEventId,
  });

  const uid = req.uid;

  if (!uid) {
    return res.status(401).json({
      ok: false as const,
      error: "Unauthorized",
      requestId,
    });
  }

  const parsedParams = rawEventDeleteParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "INVALID_PARAMS" as const,
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      },
      requestId,
    });
  }

  const { rawEventId } = parsedParams.data;
  const ref = userCollection(uid, "rawEvents").doc(rawEventId);

  let snap;
  try {
    snap = await ref.get();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest_delete",
        reasonCode: "RAW_EVENT_READ_FAILED",
        message: "Failed to read RawEvent before delete",
        day: dayUtcNow(),
        requestId,
        details: { rawEventId, err: message },
      });
    } catch {
      // do not throw
    }
    return res.status(500).json({
      ok: false as const,
      error: {
        code: "INTERNAL" as const,
        message: "Failed to read workout record",
      },
      requestId,
    });
  }

  if (!snap.exists) {
    let suppressionWritten = false;
    try {
      suppressionWritten = await recordRawEventIngestSuppression(
        uid,
        rawEventId,
        requestId,
        "delete_404",
      );
    } catch (err: unknown) {
      respondIngestDeleteSuppressionFailure(res, requestId, err);
      return;
    }
    return res.status(404).json({
      ok: false as const,
      error: {
        code: "NOT_FOUND" as const,
        message: "Workout record not found",
      },
      requestId,
      suppressionWritten,
    });
  }

  const data = snap.data();
  const parsedDoc = rawEventDocSchema.safeParse(data);
  if (!parsedDoc.success) {
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest_delete",
        reasonCode: "INVALID_RAW_EVENT_CONTRACT",
        message: "Stored RawEvent failed contract validation",
        day: dayUtcNow(),
        requestId,
        details: { rawEventId, validation: parsedDoc.error.flatten() },
      });
    } catch {
      // do not throw
    }
    return res.status(500).json({
      ok: false as const,
      error: {
        code: "INVALID_STORED_RECORD" as const,
        message: "Stored workout record is invalid",
      },
      requestId,
    });
  }

  const doc = parsedDoc.data;
  const isWorkoutKind = doc.kind === "workout" || doc.kind === "strength_workout";
  const isNutritionKind = doc.kind === "nutrition";
  const isWeightKind = doc.kind === "weight";
  const isBodyCompositionKind = doc.kind === "body_composition";
  if (!isWorkoutKind && !isNutritionKind && !isWeightKind && !isBodyCompositionKind) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "NOT_DELETABLE_KIND" as const,
        message: "Only workout, nutrition, weight, or body composition entries can be removed with this action",
      },
      requestId,
    });
  }

  const allowedProviders = isNutritionKind
    ? DELETABLE_NUTRITION_EVENT_PROVIDERS
    : isWeightKind
      ? DELETABLE_WEIGHT_EVENT_PROVIDERS
      : isBodyCompositionKind
        ? DELETABLE_BODY_COMPOSITION_EVENT_PROVIDERS
        : DELETABLE_WORKOUT_EVENT_PROVIDERS;
  if (!allowedProviders.has(doc.provider)) {
    return res.status(403).json({
      ok: false as const,
      error: {
        code: "DELETE_NOT_ALLOWED" as const,
        message: isNutritionKind
          ? "This nutrition entry can't be removed from Oli."
          : isWeightKind || isBodyCompositionKind
            ? "This body entry can't be removed from Oli."
            : "This workout can't be removed from Oli.",
      },
      requestId,
    });
  }

  try {
    await ref.delete();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await writeFailure({
        userId: uid,
        source: "ingestion",
        stage: "ingest_delete",
        reasonCode: "RAW_EVENT_DELETE_FAILED",
        message: "Failed to delete RawEvent",
        day: dayUtcNow(),
        requestId,
        details: { rawEventId, err: message },
      });
    } catch {
      // do not throw
    }
    return res.status(500).json({
      ok: false as const,
      error: {
        code: "DELETE_FAILED" as const,
        message: "Could not remove workout record",
      },
      requestId,
    });
  }

  let suppressionWritten = false;
  // Apple Health resurrection guard applies to workout + body kinds. Manual
  // nutrition logs are never re-synced, so no suppression tombstone is needed.
  if (
    isWorkoutKind ||
    ((isWeightKind || doc.kind === "body_composition") && doc.provider === "apple_health")
  ) {
    try {
      suppressionWritten = await recordRawEventIngestSuppression(
        uid,
        rawEventId,
        requestId,
        "delete_200",
      );
    } catch (err: unknown) {
      respondIngestDeleteSuppressionFailure(res, requestId, err);
      return;
    }
  }

  if (isNutritionKind) {
    try {
      await finalizeManualNutritionIngestDelete({
        userId: uid,
        rawEventId,
        payload: doc.payload,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest_delete",
          reasonCode: "NUTRITION_DELETE_DERIVED_TRUTH_FAILED",
          message: "Failed to remove derived nutrition truth after RawEvent delete",
          day: dayUtcNow(),
          requestId,
          details: { rawEventId, err: message },
        });
      } catch {
        // do not throw
      }
      return res.status(500).json({
        ok: false as const,
        error: {
          code: "DELETE_DERIVED_TRUTH_FAILED" as const,
          message: "Could not refresh nutrition totals after delete",
        },
        requestId,
      });
    }
  }

  if (isWeightKind) {
    try {
      await finalizeManualWeightIngestDelete({
        userId: uid,
        rawEventId,
        payload: doc.payload,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest_delete",
          reasonCode: "WEIGHT_DELETE_DERIVED_TRUTH_FAILED",
          message: "Failed to remove derived body truth after RawEvent delete",
          day: dayUtcNow(),
          requestId,
          details: { rawEventId, err: message },
        });
      } catch {
        // do not throw
      }
      return res.status(500).json({
        ok: false as const,
        error: {
          code: "DELETE_DERIVED_TRUTH_FAILED" as const,
          message: "Could not refresh body metrics after delete",
        },
        requestId,
      });
    }
  }

  if (isBodyCompositionKind) {
    try {
      await finalizeManualBodyCompositionIngestDelete({
        userId: uid,
        rawEventId,
        payload: doc.payload,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await writeFailure({
          userId: uid,
          source: "ingestion",
          stage: "ingest_delete",
          reasonCode: "BODY_COMPOSITION_DELETE_DERIVED_TRUTH_FAILED",
          message: "Failed to refresh body composition after RawEvent delete",
          day: dayUtcNow(),
          requestId,
          details: { rawEventId, err: message },
        });
      } catch {
        // do not throw
      }
      return res.status(500).json({
        ok: false as const,
        error: {
          code: "DELETE_DERIVED_TRUTH_FAILED" as const,
          message: "Could not refresh body composition after delete",
        },
        requestId,
      });
    }
  }

  return res.status(200).json({
    ok: true as const,
    rawEventId,
    requestId,
    suppressionWritten,
  });
});

export default router;
