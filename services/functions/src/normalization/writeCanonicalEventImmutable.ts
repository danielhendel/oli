// services/functions/src/normalization/writeCanonicalEventImmutable.ts

import crypto from "node:crypto";
import * as logger from "firebase-functions/logger";
import { admin, db } from "../firebaseAdmin";
import type { CanonicalEvent } from "../types/health";
import { canonicalEquals, canonicalHash } from "./canonicalImmutability";
import { writeFailureEntry } from "../failures/writeFailureEntry";

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

function deterministicFailureId(input: {
  userId: string;
  canonicalId: string;
  sourceRawEventId: string;
  existingHash: string;
  incomingHash: string;
}): string {
  // Keep deterministic and replay-safe, but namespaced for failures collection.
  const base = deterministicIntegrityViolationId(input);
  return `canonical_conflict_${base}`;
}

export async function writeCanonicalEventImmutable(params: {
  userId: string;
  canonical: CanonicalEvent;
  sourceRawEventId: string;
  sourceRawEventPath: string;
}): Promise<WriteCanonicalResult> {
  const { userId, canonical, sourceRawEventId, sourceRawEventPath } = params;

  const ref = db.collection("users").doc(userId).collection("events").doc(canonical.id);

  // We capture conflict metadata from inside the transaction and then
  // write failure memory outside the transaction (best-effort), so we
  // never jeopardize the canonical immutability invariant.
  const txResult = await db.runTransaction(async (tx) => {
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

  // Step 8: surface the canonical conflict into failure memory (best-effort).
  if (!txResult.ok && txResult.mode === "conflict") {
    const failureId = deterministicFailureId({
      userId,
      canonicalId: canonical.id,
      sourceRawEventId,
      existingHash: txResult.existingHash,
      incomingHash: txResult.incomingHash,
    });

    try {
      await writeFailureEntry({
        userId,
        failureId,
        type: "CANONICAL_WRITE_CONFLICT",
        code: "CANONICAL_IMMUTABILITY_CONFLICT",
        message: "Canonical immutability conflict: attempted overwrite with different content.",
        rawEventId: sourceRawEventId,
        rawEventPath: sourceRawEventPath,
        // Canonical has authoritative day/timezone fields; do not recompute here.
        timeZone: canonical.timezone ?? null,
        observedAt: canonical.start ?? canonical.end ?? null,
        details: {
          canonicalId: canonical.id,
          existingHash: txResult.existingHash,
          incomingHash: txResult.incomingHash,
          integrityViolationPath: txResult.integrityViolationPath,
        },
      });
    } catch (err) {
      // Never throw: conflict result must still return deterministically.
      logger.error("Failed to persist failure memory for canonical immutability conflict", {
        userId,
        canonicalId: canonical.id,
        sourceRawEventId,
        sourceRawEventPath,
        existingHash: txResult.existingHash,
        incomingHash: txResult.incomingHash,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return txResult;
}
