// services/api/src/routes/events.ts
import { Router, type Response } from "express";

import { rawEventDocSchema } from "@oli/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";
import { userCollection } from "../db";

const router = Router();

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  return fromMiddleware ?? fromHeader ?? undefined;
};

const dayKeyFromIso = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

/**
 * Canonical ingestion gateway (AUTHENTICATED)
 *
 * - Validates body
 * - Validates canonical RawEvent doc with @oli/contracts
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

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event",
      details: parsed.error.flatten(),
    });
  }

  const body: IngestRawEventBody = parsed.data;

  // Canonicalize timestamps
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

  const receivedAt = new Date().toISOString();
  const day = dayKeyFromIso(observedAt);

  const sourceType = "manual" as const;
  const schemaVersion = 1 as const;

  // ✅ MUST be user-scoped
  const rawEventsCol = userCollection(uid, "rawEvents");

  // ✅ Mandatory idempotency: doc id is deterministic
  const docRef = rawEventsCol.doc(idempotencyKey);
  const rawEventId = docRef.id;

  const doc = {
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
  } catch (err: unknown) {
    // If create() failed because the doc already exists, treat as an idempotent replay.
    const existing = await docRef.get();
    if (existing.exists) {
      return res.status(202).json({
        ok: true as const,
        rawEventId,
        day,
        idempotentReplay: true as const,
      });
    }
    throw err;
  }

  return res.status(202).json({ ok: true as const, rawEventId, day });
});

export default router;
