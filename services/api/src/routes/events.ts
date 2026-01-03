// services/api/src/routes/events.ts
import { Router, type Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

import { rawEventDocSchema } from "../../../../lib/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";

const router = Router();

const getIdempotencyKey = (req: AuthedRequest): string | null => {
  const v =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : null) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : null);

  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
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
router.post("/", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  // Hard requirement: ingestion must be idempotent
  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Missing Idempotency-Key header",
      details: { header: "Idempotency-Key (or X-Idempotency-Key) is required for ingestion POST routes." },
    });
  }

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid raw event",
      details: parsed.error.flatten(),
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

  // Deterministic write ID = idempotency key (retries become create() collisions)
  const docRef = rawEventsCol.doc(idempotencyKey);
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

    schemaVersion,
  };

  // ✅ Contract validation (fail fast, before writing)
  const validated = rawEventDocSchema.safeParse(doc);
  if (!validated.success) {
    return res.status(400).json({
      error: "Invalid raw event (contract)",
      details: validated.error.flatten(),
    });
  }

  try {
    // create() throws if doc already exists — perfect for idempotency
    await docRef.create(validated.data);
  } catch (err: unknown) {
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
