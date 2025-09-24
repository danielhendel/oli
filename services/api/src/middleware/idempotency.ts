import { getFirestore } from "firebase-admin/firestore";
import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth";

/**
 * Simple idempotency middleware:
 * - If Idempotency-Key header is present, we check Firestore for an existing record for (uid,key).
 * - If present, we short-circuit with the stored response (basic ack).
 * - If not, we create a marker and let the request continue.
 *
 * NOTE: This is a minimal Day 1–2 guard. Later we’ll store full response bodies per key.
 */
export async function idempotencyMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.header("Idempotency-Key");
  if (!key) {
    next();
    return;
  }

  const uid = req.uid ?? "anonymous";
  const db = getFirestore();
  const docId = `${uid}:${key}`;
  const docRef = db.collection("idempotency").doc(docId);

  try {
    const snap = await docRef.get();
    if (snap.exists) {
      res.status(200).json({ status: "ok", idempotent: true });
      return;
    }

    await docRef.set({
      createdAt: new Date().toISOString(),
      uid,
      key,
    });
    next();
    return;
  } catch {
    // Fail-open to avoid blocking requests if store is unavailable
    next();
    return;
  }
}
