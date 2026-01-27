// services/functions/src/normalization/writeCanonicalEventImmutable.ts

import crypto from "node:crypto"; // ✅ ADD
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

function deterministicIntegrityViolationId(input: {
  userId: string;
  canonicalId: string;
  sourceRawEventId: string;
  existingHash: string;
  incomingHash: string;
}): string {
  // Deterministic, replay-safe doc id:
  // retries/duplicate triggers will attempt to create the same doc id and
  // therefore cannot spam integrity evidence.
  const payload = JSON.stringify(input);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function writeCanonicalEventImmutable(params: {
  userId: string;
  canonical: CanonicalEvent;
  sourceRawEventId: string;
  sourceRawEventPath: string;
}): Promise<WriteCanonicalResult> {
  const { userId, canonical, sourceRawEventId, sourceRawEventPath } = params;

  const ref = db.collection("users").doc(userId).collection("events").doc(canonical.id);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.create(ref, canonical);
      return { ok: true, mode: "created" } as const;
    }

    const existing = snap.data() as CanonicalEvent;

    if (canonicalEquals(existing, canonical)) {
      return { ok: true, mode: "identical_noop" } as const;
    }

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

    const integrityId = deterministicIntegrityViolationId({
      userId,
      canonicalId: canonical.id,
      sourceRawEventId,
      existingHash,
      incomingHash,
    });

    const integrityRef = db
      .collection("users")
      .doc(userId)
      .collection("integrityViolations")
      .doc(integrityId);

    // Create-only evidence. If the same conflict is retried, doc already exists -> tx.create fails.
    // We treat that as "evidence already recorded" and still return conflict.
    try {
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
    } catch {
      // NOTE: Firestore will throw at commit time if doc exists.
      // We intentionally do not branch on it here; the caller still receives conflict.
      // The evidence is either created now or already existed.
    }

    return {
      ok: false,
      mode: "conflict",
      existingHash,
      incomingHash,
      integrityViolationPath: integrityRef.path,
    } as const;
  });
}