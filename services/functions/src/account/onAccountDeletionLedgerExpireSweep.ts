/**
 * Daily sweep for accountDeletions ledger TTL (ADR v1).
 * Deletes documents whose expireAt has passed; strips legacy storageDelete inventories.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
  accountDeletionLedgerExpireAt,
} from "@oli/contracts";

const ACCOUNT_DELETIONS_COLLECTION = "accountDeletions";
const BATCH_LIMIT = 200;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? new Date(t) : null;
  }
  return null;
}

export const onAccountDeletionLedgerExpireSweep = onSchedule(
  {
    schedule: "every 24 hours",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();
    let deleted = 0;
    let sanitized = 0;
    let backfilled = 0;

    // 1) Purge expired ledgers (technically enforceable retention).
    try {
      const expired = await db
        .collection(ACCOUNT_DELETIONS_COLLECTION)
        .where("expireAt", "<=", now)
        .limit(BATCH_LIMIT)
        .get();

      const batch = db.batch();
      for (const doc of expired.docs) {
        batch.delete(doc.ref);
        deleted += 1;
      }
      if (deleted > 0) await batch.commit();
    } catch (err) {
      logger.warn("account.delete.ledger_sweep: expire query failed", {
        err: err instanceof Error ? err.message : "unknown",
      });
    }

    // 2) Sanitize legacy inventories + backfill missing expireAt (bounded scan).
    const sample = await db.collection(ACCOUNT_DELETIONS_COLLECTION).limit(BATCH_LIMIT).get();
    const sanitizeBatch = db.batch();
    let sanitizeOps = 0;

    for (const doc of sample.docs) {
      const data = doc.data();
      const patch: Record<string, unknown> = {};

      if (Object.prototype.hasOwnProperty.call(data, "storageDelete")) {
        patch.storageDelete = FieldValue.delete();
        sanitized += 1;
      }

      if (!Object.prototype.hasOwnProperty.call(data, "expireAt")) {
        const anchor =
          toDate(data.completedAt) ??
          toDate(data.updatedAt) ??
          toDate(data.startedAt) ??
          new Date();
        patch.expireAt = Timestamp.fromDate(accountDeletionLedgerExpireAt(anchor));
        patch.retentionDays = ACCOUNT_DELETION_LEDGER_RETENTION_DAYS;
        backfilled += 1;
      }

      if (Object.keys(patch).length > 0) {
        sanitizeBatch.set(doc.ref, patch, { merge: true });
        sanitizeOps += 1;
      }
    }

    if (sanitizeOps > 0) await sanitizeBatch.commit();

    logger.info("account.delete.ledger_sweep: done", {
      deleted,
      sanitized,
      backfilled,
      retentionDays: ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
    });
  },
);
