// services/api/src/routes/events.ts
import { Router, type Response } from "express";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { AuthedRequest } from "../middleware/auth";
import { idempotencyMiddleware } from "../middleware/idempotency";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";

const router = Router();

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  // Try middleware-attached value first (if your idempotency middleware sets it)
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  // Fall back to common header patterns
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  return fromMiddleware ?? fromHeader ?? undefined;
};

/**
 * Canonical ingestion gateway (Step 2)
 *
 * - Validates body
 * - Writes RawEvent to: /users/{uid}/rawEvents/{rawEventId}
 * - Lets existing Firestore trigger normalize → pipeline
 *
 * Mounted at: POST /ingest/events
 */
router.post("/", idempotencyMiddleware, async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    // Should never happen because authMiddleware is mounted upstream, but keep it safe.
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid raw event",
      details: parsed.error.flatten(),
    });
  }

  const body: IngestRawEventBody = parsed.data;

  const db = getFirestore();
  const rawEventsCol = db.collection("users").doc(uid).collection("rawEvents");

  // Use idempotency key as document id when present (strong idempotency)
  const idempotencyKey = getIdempotencyKey(req);
  const docRef = idempotencyKey ? rawEventsCol.doc(idempotencyKey) : rawEventsCol.doc();

  const rawEventId = docRef.id;

  const doc = {
    id: rawEventId,
    userId: uid,
    provider: body.provider,
    kind: body.kind,
    payload: body.payload,
    occurredAt: body.occurredAt,
    sourceId: body.sourceId ?? "manual",
    receivedAt: FieldValue.serverTimestamp(),
  };

  try {
    // create() throws if doc already exists — perfect for idempotency
    await docRef.create(doc);
  } catch (err: unknown) {
    // If already exists, treat as accepted (idempotent replay)
    // Firestore error codes vary; safest is to attempt a read.
    const existing = await docRef.get();
    if (existing.exists) {
      return res.status(202).json({ status: "accepted", rawEventId, idempotentReplay: true });
    }
    throw err;
  }

  return res.status(202).json({ status: "accepted", rawEventId });
});

export default router;
