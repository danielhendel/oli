// services/functions/src/normalization/writeCanonicalEventImmutable.ts

import * as logger from "firebase-functions/logger";
import { admin, db } from "../firebaseAdmin";
import type { CanonicalEvent } from "../types/health";
import { canonicalEquals, canonicalHash } from "./canonicalImmutability";

export type WriteCanonicalResult =
  | { ok: true; mode: "created" | "identical_noop" }
  | {
      ok: false;
      mode: "conflict";
      existingHash: string;
      incomingHash: string;
      integrityViolationPath: string;
    };

export async function writeCanonicalEventImmutable(params: {
  userId: string;
  canonical: CanonicalEvent;
  sourceRawEventId: string;
  sourceRawEventPath: string;
}): Promise<WriteCanonicalResult> {
  const { userId, canonical, sourceRawEventId, sourceRawEventPath } = params;

  const ref = db.collection("users").doc(userId).collection("events").doc(canonical.id);
  const integrityRef = db
    .collection("users")
    .doc(userId)
    .collection("integrityViolations")
    .doc();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      // Create-only: canonical truth is immutable once written.
      tx.create(ref, canonical);
      return { ok: true, mode: "created" } as const;
    }

    const existing = snap.data() as CanonicalEvent;

    if (canonicalEquals(existing, canonical)) {
      // Idempotent replay: identical canonical event is allowed, but we do not rewrite.
      return { ok: true, mode: "identical_noop" } as const;
    }

    // Conflict: same canonical ID but different content (corruption vector).
    const existingHash = canonicalHash(existing);
    const incomingHash = canonicalHash(canonical);

    logger.error("Canonical immutability violation: attempted overwrite with different content", {
      userId,
      canonicalId: canonical.id,
      sourceRawEventId,
      sourceRawEventPath,
      existingHash,
      incomingHash,
    });

    // Persist the violation as first-class evidence (no silent drops).
    // Note: Admin SDK bypasses rules; collection is not client-readable by default.
    tx.create(integrityRef, {
      type: "CANONICAL_IMMUTABILITY_CONFLICT" as const,
      userId,
      canonicalId: canonical.id,
      sourceRawEventId,
      sourceRawEventPath,
      existingHash,
      incomingHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Do NOT overwrite. Return conflict so caller can decide retry/alert behavior.
    return {
      ok: false,
      mode: "conflict",
      existingHash,
      incomingHash,
      integrityViolationPath: integrityRef.path,
    } as const;
  });
}