// services/functions/src/account/onAccountDeleteRequested.ts

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
  accountDeletionLedgerExpireAt,
} from "@oli/contracts";
import {
  ACCOUNT_DELETION_FIRESTORE_COLLECTIONS,
  accountDeletionAppStoragePrefixes,
  accountDeletionExportStoragePrefix,
  globalAccountDeletionDocId,
  globalAccountExportDocId,
} from "../../../../lib/data/user-data/accountDeletionFirestoreCollections";
import { deleteStoragePrefix } from "./documentAccountDelete";
import { deleteRefreshToken } from "../../../api/src/lib/ouraSecrets";

const TOPIC = "account.delete.v1";
const ACCOUNT_DELETIONS_COLLECTION = "accountDeletions";
const ACCOUNT_EXPORTS_COLLECTION = "accountExports";
const DEFAULT_EXPORTS_BUCKET = "oli-staging-fdbba-staging-data-exports";

type AccountDeleteMessage = {
  uid: string;
  requestId?: string;
  requestedAt?: string;
};

const assertUid = (uid: unknown): uid is string => typeof uid === "string" && uid.trim().length > 0;

function deletionDocRef(db: FirebaseFirestore.Firestore, uid: string, requestId: string) {
  const id = globalAccountDeletionDocId(uid, requestId);
  return db.collection(ACCOUNT_DELETIONS_COLLECTION).doc(id);
}

function userDeletionStatusRef(db: FirebaseFirestore.Firestore, uid: string, requestId: string) {
  return db.collection("users").doc(uid).collection("accountDeletion").doc(requestId);
}

async function mirrorUserDeletionStatus(
  db: FirebaseFirestore.Firestore,
  uid: string,
  requestId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const safe: Record<string, unknown> = {
    requestId,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof patch.status === "string") safe.status = patch.status;
  if (typeof patch.error === "string") safe.error = patch.error;
  if (patch.completedAt != null) safe.completedAt = patch.completedAt;
  if (patch.startedAt != null) safe.startedAt = patch.startedAt;
  await userDeletionStatusRef(db, uid, requestId).set(safe, { merge: true });
}

async function deleteUserFirestoreSubtree(db: FirebaseFirestore.Firestore, uid: string) {
  const userRef = db.collection("users").doc(uid);

  for (const col of ACCOUNT_DELETION_FIRESTORE_COLLECTIONS) {
    await db.recursiveDelete(userRef.collection(col));
  }

  await userRef.delete().catch(() => {
    /* ignore already-deleted */
  });
}

async function deleteAuthUser(uid: string) {
  const auth = getAuth();
  try {
    await auth.deleteUser(uid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("user-not-found")) return;
    throw err;
  }
}

function resolveAppStorageBucket(): string | null {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  const project = process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim();
  return fromEnv || (project ? `${project}.firebasestorage.app` : null);
}

function resolveExportsBucket(): string {
  return process.env.EXPORTS_BUCKET?.trim() || DEFAULT_EXPORTS_BUCKET;
}

async function deleteStoragePrefixes(args: {
  bucketName: string;
  prefixes: readonly string[];
}): Promise<{ results: Awaited<ReturnType<typeof deleteStoragePrefix>>[]; failed: boolean }> {
  const bucket = getStorage().bucket(args.bucketName);
  const results = [];
  for (const prefix of args.prefixes) {
    const result = await deleteStoragePrefix({
      prefix,
      listFiles: async (p) => {
        const [files] = await bucket.getFiles({ prefix: p });
        return files.map((f) => f.name);
      },
      deleteFile: async (objectPath) => {
        await bucket.file(objectPath).delete({ ignoreNotFound: true });
      },
    });
    results.push(result);
  }
  return { results, failed: results.some((r) => r.errors.length > 0) };
}

async function deleteGlobalExportDocs(db: FirebaseFirestore.Firestore, uid: string): Promise<void> {
  const prefix = `${uid}_`;
  const snap = await db.collection(ACCOUNT_EXPORTS_COLLECTION).get();
  const batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    if (doc.id.startsWith(prefix)) {
      batch.delete(doc.ref);
      count += 1;
    }
  }
  if (count > 0) await batch.commit();
}

async function revokeIntegrationCredentials(db: FirebaseFirestore.Firestore, uid: string): Promise<void> {
  try {
    await deleteRefreshToken(uid);
  } catch {
    // Best-effort token destroy; Firestore cleanup still proceeds.
  }

  await db
    .collection("system")
    .doc("integrations")
    .collection("oura_connected")
    .doc(uid)
    .delete()
    .catch(() => undefined);
}

/**
 * Account deletion executor
 *
 * Order: mark in_progress → revoke integrations → delete storage → delete Firestore → Auth last → ledger completed.
 * Durable ledger must already exist from API accept (ADR v1); worker upserts if missing for crash recovery.
 */
export const onAccountDeleteRequested = onMessagePublished(
  {
    topic: TOPIC,
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const payload = event.data?.message?.json as unknown;

    if (!payload || typeof payload !== "object") {
      logger.error("account.delete: invalid payload");
      return;
    }

    const { uid, requestId = event.id, requestedAt } = payload as AccountDeleteMessage;

    if (!assertUid(uid)) {
      logger.error("account.delete: invalid uid");
      return;
    }

    const db = getFirestore();
    const ref = deletionDocRef(db, uid, requestId);

    const snap = await ref.get();
    if (snap.exists && snap.data()?.status === "completed") {
      logger.info("account.delete: already completed, skipping");
      return;
    }

    // Ensure durable ledger exists before destructive work (recovery if accept-time write was lost).
    await ref.set(
      {
        uid,
        requestId,
        requestedAt: requestedAt ?? null,
        status: "in_progress",
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expireAt: Timestamp.fromDate(accountDeletionLedgerExpireAt(new Date())),
        retentionDays: ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
        storageDelete: FieldValue.delete(),
      },
      { merge: true },
    );
    await mirrorUserDeletionStatus(db, uid, requestId, {
      status: "in_progress",
      startedAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    try {
      logger.info("account.delete: revoking integration credentials");
      await revokeIntegrationCredentials(db, uid);

      logger.info("account.delete: deleting export artifacts");
      const exportsBucket = resolveExportsBucket();
      const exportStorageOutcome = await deleteStoragePrefixes({
        bucketName: exportsBucket,
        prefixes: [accountDeletionExportStoragePrefix(uid)],
      });
      if (exportStorageOutcome.failed) {
        throw new Error("export_storage_delete_partial_failure");
      }
      await deleteGlobalExportDocs(db, uid);

      const appBucket = resolveAppStorageBucket();
      if (!appBucket) {
        throw new Error("app_storage_bucket_unavailable");
      }

      logger.info("account.delete: deleting app storage prefixes");
      const storageOutcome = await deleteStoragePrefixes({
        bucketName: appBucket,
        prefixes: accountDeletionAppStoragePrefixes(uid),
      });
      if (storageOutcome.failed) {
        throw new Error("document_storage_delete_partial_failure");
      }

      logger.info("account.delete: deleting firestore subtree");
      await deleteUserFirestoreSubtree(db, uid);

      logger.info("account.delete: deleting auth user");
      await deleteAuthUser(uid);

      // Minimized completed ledger — no Storage path inventories (ADR v1).
      const completedExpireAt = Timestamp.fromDate(accountDeletionLedgerExpireAt(new Date()));
      await ref.set(
        {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          expireAt: completedExpireAt,
          retentionDays: ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
          storageDelete: FieldValue.delete(),
        },
        { merge: true },
      );

      logger.info("account.delete: completed");
    } catch (err) {
      logger.error("account.delete: failed", { err });

      const errorCode =
        err instanceof Error && err.message.length > 0 && err.message.length < 80
          ? err.message
          : "delete_failed";

      await ref.set(
        {
          status: "failed",
          error: errorCode,
          updatedAt: FieldValue.serverTimestamp(),
          expireAt: Timestamp.fromDate(accountDeletionLedgerExpireAt(new Date())),
          retentionDays: ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
          storageDelete: FieldValue.delete(),
        },
        { merge: true },
      );
      await mirrorUserDeletionStatus(db, uid, requestId, {
        status: "failed",
        error: errorCode,
      }).catch(() => undefined);

      throw err;
    }
  },
);

// Exported for tests
export {
  deleteUserFirestoreSubtree,
  revokeIntegrationCredentials,
  deleteGlobalExportDocs,
  globalAccountExportDocId,
};
