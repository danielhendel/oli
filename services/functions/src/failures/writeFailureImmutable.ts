// services/functions/src/failures/writeFailureImmutable.ts

import crypto from "node:crypto";
import { admin, db } from "../firebaseAdmin";
import { stableStringify } from "../ingestion/stableJson";

/**
 * Failure source: which subsystem produced the failure.
 */
export type FailureSource = "ingestion" | "normalization" | "pipeline";

/**
 * Input for writing an immutable failure record.
 * details must be bounded and safe (no raw payload dumps, no tokens).
 */
export type FailureInput = {
  userId: string;
  source: FailureSource;
  stage: string;
  reasonCode: string;
  message: string;
  day: string; // YYYY-MM-DD
  rawEventId?: string;
  canonicalEventId?: string;
  requestId?: string;
  /** Bounded, safe details (no secrets, no raw payloads) */
  details?: Record<string, unknown>;
};

type FailureDoc = FailureInput & {
  createdAt: unknown;
};

/**
 * Deterministic failureId from identity tuple.
 * Same tuple => same id (idempotent create-or-assert).
 */
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

/**
 * Write an immutable failure record.
 * Create-or-assert-identical: if doc exists and identical => no-op.
 * If exists and different => create second record with suffix hash (never overwrite).
 */
export async function writeFailureImmutable(
  ctx: { requestId?: string },
  input: FailureInput,
): Promise<{ id: string }> {
  const baseId = computeFailureId(input);
  const failuresRef = db.collection("users").doc(input.userId).collection("failures");

  const doc: FailureDoc = {
    ...input,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const baseRef = failuresRef.doc(baseId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(baseRef);

    if (!snap.exists) {
      tx.create(baseRef, doc);
      return { id: baseId };
    }

    const existing = snap.data() as FailureDoc;
    const incomingStable = stableStringify({
      ...input,
      createdAt: null,
    });
    const existingStable = stableStringify({
      ...existing,
      createdAt: null,
    });

    if (incomingStable === existingStable) {
      return { id: baseId };
    }

    // Exists and different: create second record with suffix (never overwrite)
    const suffixPayload = stableStringify({
      ...input,
      existingCreatedAt: existing.createdAt,
      attemptAt: new Date().toISOString(),
    });

    const suffixHash = crypto.createHash("sha256").update(suffixPayload).digest("hex").slice(0, 8);
    const altId = `${baseId}_${suffixHash}`;
    const altRef = failuresRef.doc(altId);

    tx.create(altRef, doc);
    return { id: altId };
  });
}
