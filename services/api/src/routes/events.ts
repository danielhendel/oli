// services/api/src/routes/events.ts
import { Router, type Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

import { rawEventDocSchema } from "../../../../lib/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { idempotencyMiddleware } from "../middleware/idempotency";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";

const router = Router();

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  return fromMiddleware ?? fromHeader ?? undefined;
};

const dayKeyFromIso = (iso: string): string => {
  // Normalize to UTC day key YYYY-MM-DD
  return new Date(iso).toISOString().slice(0, 10);
};

/**
 * Canonical ingestion gateway
 *
 * - Validates body
 * - Validates canonical RawEvent doc with @oli/contracts
 * - Writes RawEvent to: /users/{uid}/rawEvents/{rawEventId}
 * - Firestore trigger normalizes → pipeline
 *
 * Mounted at: POST /ingest/events
 */
router.post("/", idempotencyMiddleware, async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid raw event",
      details: parsed.error.flatten()
    });
  }

  const body: IngestRawEventBody = parsed.data;

  // Canonicalize timestamps
  const observedAt = body.observedAt ?? body.occurredAt;
  if (!observedAt) {
    // Should be impossible because schema enforces, but keep a hard guard.
    return res.status(400).json({ error: "Missing observedAt/occurredAt" });
  }

  // IMPORTANT: Functions expect ISO strings for all timestamps.
  const receivedAt = new Date().toISOString();
  const day = dayKeyFromIso(observedAt);

  // IMPORTANT: Functions RawEvent expects `sourceType` and `schemaVersion`.
  // For Step 2 (manual only) we set sourceType='manual'.
  const sourceType = "manual" as const;
  const schemaVersion = 1 as const;

  const db = getFirestore();
  const rawEventsCol = db.collection("users").doc(uid).collection("rawEvents");

  const idempotencyKey = getIdempotencyKey(req);
  const docRef = idempotencyKey ? rawEventsCol.doc(idempotencyKey) : rawEventsCol.doc();

  const rawEventId = docRef.id;

  // CANONICAL RawEvent envelope (must match @oli/contracts rawEventDocSchema)
  const doc = {
    id: rawEventId,
    userId: uid,

    sourceId: body.sourceId ?? "manual",
    sourceType,

    provider: body.provider, // "manual" (for now)
    kind: body.kind,

    receivedAt, // ISO string
    observedAt, // ISO string

    payload: body.payload,

    schemaVersion
  };

  // ✅ Contract validation (fail fast, before writing)
  const validated = rawEventDocSchema.safeParse(doc);
  if (!validated.success) {
    return res.status(400).json({
      error: "Invalid raw event (contract)",
      details: validated.error.flatten()
    });
  }

  try {
    // create() throws if doc already exists — perfect for idempotency
    await docRef.create(validated.data);
  } catch (err: unknown) {
    const existing = await docRef.get();
    if (existing.exists) {
      return res.status(202).json({ ok: true as const, rawEventId, day, idempotentReplay: true as const });
    }
    throw err;
  }

  return res.status(202).json({ ok: true as const, rawEventId, day });
});

export default router;
