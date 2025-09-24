import { Router, type Response } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import type { AuthedRequest } from "../middleware/auth.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";
import { publishJSON } from "../lib/pubsub.js";
import { eventSchema, type EventPayload } from "../types/events.js";

const router = Router();

/**
 * Ingest events
 * - Validates body against eventSchema
 * - Stores a raw copy in Firestore (events_raw)
 * - Publishes to Pub/Sub topic
 * - Plays nicely with idempotency key middleware
 */
router.post("/", idempotencyMiddleware, async (req: AuthedRequest, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid event", details: parsed.error.flatten() });
  }

  const payload: EventPayload = parsed.data;
  const db = getFirestore();

  // Store raw copy (optional)
  await db.collection("events_raw").add({
    ...payload,
    uid: req.uid ?? null,
    receivedAt: FieldValue.serverTimestamp(),
  });

  // Publish to Pub/Sub
  const topic = process.env.TOPIC_EVENTS_RAW ?? "events.raw.v1";
  await publishJSON(topic, payload);

  return res.status(202).json({ status: "accepted" });
});

export default router;
