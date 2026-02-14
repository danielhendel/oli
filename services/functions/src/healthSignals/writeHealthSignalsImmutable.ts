// services/functions/src/healthSignals/writeHealthSignalsImmutable.ts
// Phase 1.5 Sprint 4 — create-or-assert-identical for healthSignals/{dayKey}

import type { Firestore } from "firebase-admin/firestore";
import type { HealthSignalDocResult } from "./computeHealthSignalsV1";

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(normalize);

    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) throw new Error("stableStringify: circular structure");
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = normalize(obj[k]);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

/** Canonical form for immutability: exclude computedAt so replay runs with same inputs are identical. */
function canonicalForComparison(doc: Record<string, unknown>): string {
  const rest = { ...doc };
  delete rest.computedAt;
  return stableStringify(rest);
}

/**
 * Write health signals document immutably: create if missing, else assert identical (by canonical content).
 * computedAt is excluded from comparison so multiple pipeline runs with same inputs are idempotent.
 * Throws on attempt to overwrite with different logical content (replay-safe, deterministic).
 */
export async function writeHealthSignalsImmutable(args: {
  db: Firestore;
  userId: string;
  dayKey: string;
  doc: HealthSignalDocResult;
}): Promise<void> {
  const { db, userId, dayKey, doc } = args;
  const ref = db.collection("users").doc(userId).collection("healthSignals").doc(dayKey);
  const payload = doc as unknown as Record<string, unknown>;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, payload);
      return;
    }

    const existing = snap.data() as Record<string, unknown> | undefined;
    const a = canonicalForComparison(existing ?? {});
    const b = canonicalForComparison(payload);

    if (a !== b) {
      throw new Error(
        `Health signals immutability violation: attempted to overwrite ${ref.path} with different content.`,
      );
    }
  });
}
