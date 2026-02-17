/**
 * API-side failure record write (Phase 3B).
 * Matches FailureEntry shape and deterministic id intent from functions.
 * Used when Withings pull fails per-user (e.g. API error) so failures are visible.
 */

import crypto from "node:crypto";
import { db, userCollection, FieldValue } from "../db";
import { stableStringify } from "./stableJson";

export type FailureSource = "ingestion" | "normalization" | "pipeline";

export type FailureInput = {
  userId: string;
  source: FailureSource;
  stage: string;
  reasonCode: string;
  message: string;
  day: string;
  rawEventId?: string;
  canonicalEventId?: string;
  requestId?: string;
  details?: Record<string, unknown>;
};

function computeFailureId(input: FailureInput): string {
  const tuple = {
    userId: input.userId,
    source: input.source,
    stage: input.stage,
    reasonCode: input.reasonCode,
    day: input.day,
    rawEventId: input.rawEventId ?? null,
    canonicalEventId: input.canonicalEventId ?? null,
    requestId: input.requestId ?? null,
  };
  const serialized = stableStringify(tuple);
  return crypto.createHash("sha256").update(serialized).digest("hex").slice(0, 32);
}

function computeAltSuffix(existingStable: string, incomingStable: string): string {
  const payload = stableStringify({ existingStable, incomingStable });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 8);
}

/**
 * Write a failure record to users/{uid}/failures.
 * Create-or-assert-identical:
 * - if base doc exists and identical => no-op
 * - if base doc exists and different => create deterministic alt doc id (never overwrite)
 */
export async function writeFailure(input: FailureInput): Promise<{ id: string }> {
  const baseId = computeFailureId(input);
  const failuresRef = userCollection(input.userId, "failures");

  const baseRef = failuresRef.doc(baseId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(baseRef);

    const docToWrite = {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (!snap.exists) {
      tx.create(baseRef, docToWrite);
      return { id: baseId };
    }

    const existing = snap.data() as FailureInput & { createdAt: unknown };

    // Compare stable content ignoring createdAt timestamps.
    const incomingStable = stableStringify({ ...input, createdAt: null });
    const existingStable = stableStringify({ ...existing, createdAt: null });

    if (incomingStable === existingStable) {
      return { id: baseId };
    }

    // Deterministic alt id derived from stable content (no wall clock).
    const suffix = computeAltSuffix(existingStable, incomingStable);
    const altId = `${baseId}_${suffix}`;
    const altRef = failuresRef.doc(altId);

    const altSnap = await tx.get(altRef);
    if (!altSnap.exists) {
      tx.create(altRef, docToWrite);
      return { id: altId };
    }

    // If alt exists, check if identical; if so, return it.
    const altExisting = altSnap.data() as FailureInput & { createdAt: unknown };
    const altExistingStable = stableStringify({ ...altExisting, createdAt: null });

    if (incomingStable === altExistingStable) {
      return { id: altId };
    }

    // Extremely rare: altId collision with different contents.
    // Create a second deterministic suffix from (altExistingStable + incomingStable).
    const suffix2 = computeAltSuffix(altExistingStable, incomingStable);
    const altId2 = `${baseId}_${suffix}_${suffix2}`;
    const altRef2 = failuresRef.doc(altId2);

    const altSnap2 = await tx.get(altRef2);
    if (!altSnap2.exists) {
      tx.create(altRef2, docToWrite);
      return { id: altId2 };
    }

    // If even alt2 exists, fail closed: return baseId (we refuse to overwrite).
    // Caller should treat this as "failure recorded or already exists".
    return { id: baseId };
  });
}
