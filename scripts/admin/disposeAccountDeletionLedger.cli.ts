#!/usr/bin/env npx tsx
/**
 * Staging admin: disposition accountDeletions ledger — strip storageDelete, backfill expireAt.
 * Prints only sanitized counts (no UIDs, request IDs, paths, or payloads).
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=oli-staging-fdbba npx tsx --tsconfig scripts/tsconfig.json \
 *     scripts/admin/disposeAccountDeletionLedger.cli.ts
 */

import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
  accountDeletionLedgerExpireAt,
} from "../../lib/contracts/accountDeletion";

const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || "oli-staging-fdbba";

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

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();
  const snap = await db.collection("accountDeletions").get();

  let scanned = 0;
  let strippedStorageDelete = 0;
  let backfilledExpireAt = 0;
  let alreadyCompliant = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data();
    const patch: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(data, "storageDelete")) {
      patch.storageDelete = FieldValue.delete();
      strippedStorageDelete += 1;
    }

    if (!Object.prototype.hasOwnProperty.call(data, "expireAt")) {
      const anchor =
        toDate(data.completedAt) ??
        toDate(data.updatedAt) ??
        toDate(data.startedAt) ??
        new Date();
      patch.expireAt = Timestamp.fromDate(accountDeletionLedgerExpireAt(anchor));
      patch.retentionDays = ACCOUNT_DELETION_LEDGER_RETENTION_DAYS;
      backfilledExpireAt += 1;
    }

    if (Object.keys(patch).length === 0) {
      alreadyCompliant += 1;
      continue;
    }

    await doc.ref.set(patch, { merge: true });
  }

  console.log(
    JSON.stringify(
      {
        projectId,
        scanned,
        strippedStorageDelete,
        backfilledExpireAt,
        alreadyCompliant,
        retentionDays: ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("DISPOSE_FAILED", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
