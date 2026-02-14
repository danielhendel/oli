// services/functions/src/account/onAccountExportRequested.ts

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const TOPIC = "exports.requests.v1";

// Global lifecycle collection (NOT under /users/{uid})
const ACCOUNT_EXPORTS_COLLECTION = "accountExports";

// Confirmed to exist in staging runtime evidence.
// Hard default keeps deployment deterministic.
const DEFAULT_EXPORTS_BUCKET = "oli-staging-fdbba-staging-data-exports";

type AccountExportMessage = {
  uid: string;
  requestId?: string;
  requestedAt?: string;
};

const assertUid = (uid: unknown): uid is string => typeof uid === "string" && uid.trim().length > 0;

function exportDocRef(db: FirebaseFirestore.Firestore, uid: string, requestId: string) {
  // Single doc per (uid, requestId) for idempotency & observability.
  // Keep IDs short + safe (Firestore disallows "/")
  const id = `${uid}_${requestId}`.replace(/\//g, "_");
  return db.collection(ACCOUNT_EXPORTS_COLLECTION).doc(id);
}

async function readCollectionAll(
  db: FirebaseFirestore.Firestore,
  path: string,
): Promise<Record<string, unknown>[]> {
  const snap = await db.collection(path).get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
}

/**
 * Account export executor
 *
 * Guarantees:
 * - user-scoped data read only
 * - idempotent
 * - observable lifecycle (queued → in_progress → completed|failed)
 * - writes GCS artifact + pointer in Firestore
 *
 * NOTE:
 * Lifecycle doc is stored outside /users/{uid} so account deletion cannot resurrect user subtree.
 */
export const onAccountExportRequested = onMessagePublished(
  {
    topic: TOPIC,
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const payload = event.data?.message?.json as unknown;

    if (!payload || typeof payload !== "object") {
      logger.error("account.export: invalid payload");
      return;
    }

    const { uid, requestId = event.id, requestedAt } = payload as AccountExportMessage;

    if (!assertUid(uid)) {
      logger.error("account.export: invalid uid", { uid });
      return;
    }

    const db = getFirestore();
    const ref = exportDocRef(db, uid, requestId);

    // Idempotency guard
    const snap = await ref.get();
    if (snap.exists && snap.data()?.status === "completed") {
      logger.info("account.export: already completed", { uid, requestId });
      return;
    }

    // Mark in progress
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
      const bucketName = process.env.EXPORTS_BUCKET?.trim() || DEFAULT_EXPORTS_BUCKET;

      logger.info("account.export: collecting data", {
        uid,
        requestId,
        bucketName,
      });

      const profileGeneralSnap = await db.doc(`users/${uid}/profile/general`).get();
      const profileGeneral = profileGeneralSnap.exists ? profileGeneralSnap.data() : null;

      const collections = ["rawEvents", "events", "dailyFacts", "insights", "intelligenceContext", "healthScores", "healthSignals"] as const;

      const data: Record<string, unknown> = {
        profile: { general: profileGeneral },
        collections: {},
      };

      for (const col of collections) {
        (data.collections as Record<string, unknown>)[col] = await readCollectionAll(db, `users/${uid}/${col}`);
      }

      const artifact = {
        schemaVersion: 1,
        kind: "account.export.v1",
        uid,
        requestId,
        requestedAt: requestedAt ?? null,
        generatedAt: new Date().toISOString(),
        data,
      };

      const objectPath = `exports/${uid}/${requestId}.json`;
      const storage = getStorage();
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(objectPath);

      const body = Buffer.from(JSON.stringify(artifact), "utf8");

      logger.info("account.export: writing artifact", {
        uid,
        requestId,
        objectPath,
        bytes: body.length,
      });

      await file.save(body, {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: {
          metadata: {
            uid,
            requestId,
            kind: "account.export.v1",
          },
        },
      });

      const [meta] = await file.getMetadata();

      await ref.set(
        {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          artifact: {
            bucket: bucketName,
            object: objectPath,
            contentType: meta.contentType ?? "application/json",
            size: meta.size ? Number(meta.size) : null,
            generation: meta.generation ?? null,
            md5Hash: meta.md5Hash ?? null,
            updated: meta.updated ?? null,
          },
        },
        { merge: true },
      );

      logger.info("account.export: completed", { uid, requestId });
    } catch (err) {
      logger.error("account.export: failed", { uid, requestId, err });

      await ref.set(
        {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      throw err; // allow retry
    }
  },
);