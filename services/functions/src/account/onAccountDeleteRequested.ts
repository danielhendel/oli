// services/functions/src/account/onAccountDeleteRequested.ts

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS,
  deleteStoragePrefix,
  documentAccountStoragePrefixes,
} from "./documentAccountDelete";

const TOPIC = "account.delete.v1";

// Global lifecycle collection (NOT under /users/{uid})
const ACCOUNT_DELETIONS_COLLECTION = "accountDeletions";

type AccountDeleteMessage = {
  uid: string;
  requestId?: string;
  requestedAt?: string;
};

const assertUid = (uid: unknown): uid is string => typeof uid === "string" && uid.trim().length > 0;

function deletionDocRef(db: FirebaseFirestore.Firestore, uid: string, requestId: string) {
  // Single doc per (uid, requestId) for idempotency & observability.
  // Keep IDs short + safe (Firestore disallows "/")
  const id = `${uid}_${requestId}`.replace(/\//g, "_");
  return db.collection(ACCOUNT_DELETIONS_COLLECTION).doc(id);
}

async function deleteUserFirestoreSubtree(db: FirebaseFirestore.Firestore, uid: string) {
  const userRef = db.collection("users").doc(uid);

  // ✅ Verified: profile exists (functions index writes users/{uid}/profile/general)
  // Keep accountDeletion here to clean up any legacy docs from earlier versions.
  const collections = [
    "profile",
    "exerciseDefinitions",
    "rawEvents",
    "rawEventIngestSuppressions",
    "events",
    "dailyFacts",
    "insights",
    "intelligenceContext",
    "healthScores",
    "healthSignals",
    "accountDeletion",
    ...DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS,
  ] as const;

  for (const col of collections) {
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

async function deleteUserDocumentStorage(uid: string): Promise<{
  results: Awaited<ReturnType<typeof deleteStoragePrefix>>[];
  failed: boolean;
}> {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  const project = process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim();
  const bucketName = fromEnv || (project ? `${project}.firebasestorage.app` : null);

  if (!bucketName) {
    return {
      results: [],
      failed: true,
    };
  }

  const bucket = getStorage().bucket(bucketName);
  const results = [];
  for (const prefix of documentAccountStoragePrefixes(uid)) {
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

/**
 * Account deletion executor
 *
 * Guarantees:
 * - user-scoped deletes only (data removed under /users/{uid})
 * - Document OS Firestore + original Storage prefixes removed
 * - idempotent (safe retries)
 * - observable lifecycle state (stored outside user subtree)
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
      logger.error("account.delete: invalid uid", { uid });
      return;
    }

    const db = getFirestore();
    const ref = deletionDocRef(db, uid, requestId);

    // Idempotency guard
    const snap = await ref.get();
    if (snap.exists && snap.data()?.status === "completed") {
      logger.info("account.delete: already completed, skipping", { uid, requestId });
      return;
    }

    // Mark in-progress
    await ref.set(
      {
        uid,
        requestId,
        requestedAt: requestedAt ?? null,
        status: "in_progress",
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    try {
      logger.info("account.delete: deleting document storage prefixes", { uid, requestId });
      const storageOutcome = await deleteUserDocumentStorage(uid);
      if (storageOutcome.failed) {
        await ref.set(
          {
            status: "failed",
            error: "document_storage_delete_partial_failure",
            storageDelete: storageOutcome.results,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        throw new Error("document_storage_delete_partial_failure");
      }

      logger.info("account.delete: deleting firestore subtree", { uid, requestId });
      await deleteUserFirestoreSubtree(db, uid);

      logger.info("account.delete: deleting auth user", { uid, requestId });
      await deleteAuthUser(uid);

      await ref.set(
        {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          storageDelete: storageOutcome.results,
        },
        { merge: true },
      );

      logger.info("account.delete: completed", { uid, requestId });
    } catch (err) {
      logger.error("account.delete: failed", { uid, requestId, err });

      await ref.set(
        {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      throw err; // let Pub/Sub retry
    }
  },
);
