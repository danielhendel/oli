// services/functions/src/account/onAccountExportRequested.ts

import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS } from "./assembleDocumentExportSection";
import { buildDocumentExportPackage } from "./buildDocumentExportPackage";
import { stripExtractionForExport, stripJobForExport } from "./assembleDocumentExportSection";

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

function resolveAppStorageBucket(): string | null {
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  const project = process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim();
  return fromEnv || (project ? `${project}.firebasestorage.app` : null);
}

/**
 * Account export executor
 *
 * Guarantees:
 * - user-scoped data read only
 * - includes original document bytes in a ZIP package (documents/<domain>/…)
 * - idempotent
 * - observable lifecycle (queued → in_progress → completed|failed)
 * - incomplete original packaging fails closed (no false completeness)
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

    const snap = await ref.get();
    if (snap.exists && snap.data()?.status === "completed") {
      logger.info("account.export: already completed", { uid, requestId });
      return;
    }

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
      const exportsBucketName = process.env.EXPORTS_BUCKET?.trim() || DEFAULT_EXPORTS_BUCKET;
      const appBucketName = resolveAppStorageBucket();
      if (!appBucketName) {
        throw new Error("firebase_storage_bucket_unresolved");
      }

      logger.info("account.export: collecting data", {
        requestId,
        exportsBucketName,
      });

      const profileGeneralSnap = await db.doc(`users/${uid}/profile/general`).get();
      const profileGeneral = profileGeneralSnap.exists ? profileGeneralSnap.data() : null;

      const profileMainSnap = await db.doc(`users/${uid}/profile/main`).get();
      const profileMain = profileMainSnap.exists ? profileMainSnap.data() : null;

      const collections = [
        "rawEvents",
        "events",
        "dailyFacts",
        "insights",
        "intelligenceContext",
        "healthScores",
        "healthSignals",
        ...DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS,
      ] as const;

      const collectionsData: Record<string, Record<string, unknown>[]> = {};
      for (const col of collections) {
        collectionsData[col] = await readCollectionAll(db, `users/${uid}/${col}`);
      }

      const appBucket = getStorage().bucket(appBucketName);
      const generatedAt = new Date().toISOString();

      const packaged = await buildDocumentExportPackage({
        uid,
        generatedAt,
        requestId,
        documents: collectionsData.documents ?? [],
        labUploads: collectionsData.labUploads ?? [],
        jobs: (collectionsData.documentIngestionJobs ?? []).map(stripJobForExport),
        extractions: (collectionsData.documentExtractions ?? []).map(stripExtractionForExport),
        profile: { general: profileGeneral, main: profileMain },
        otherCollections: {
          rawEvents: collectionsData.rawEvents ?? [],
          events: collectionsData.events ?? [],
          dailyFacts: collectionsData.dailyFacts ?? [],
          insights: collectionsData.insights ?? [],
          intelligenceContext: collectionsData.intelligenceContext ?? [],
          healthScores: collectionsData.healthScores ?? [],
          healthSignals: collectionsData.healthSignals ?? [],
          labResults: collectionsData.labResults ?? [],
        },
        readObjectBytes: async (objectPath) => {
          try {
            const [buf] = await appBucket.file(objectPath).download();
            return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/no such object|not.?found/i.test(msg)) return null;
            throw err;
          }
        },
      });

      if (!packaged.complete) {
        await ref.set(
          {
            status: "failed",
            error: "document_export_incomplete",
            incomplete: packaged.incomplete,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        logger.error("account.export: incomplete original packaging", {
          requestId,
          incompleteCount: packaged.incomplete.length,
        });
        // Fail closed — do not write a "completed" artifact that omits originals.
        throw new Error(`document_export_incomplete:${packaged.incomplete.join(",")}`);
      }

      const objectPath = `exports/${uid}/${requestId}.zip`;
      const exportsBucket = getStorage().bucket(exportsBucketName);
      const file = exportsBucket.file(objectPath);

      logger.info("account.export: writing zip artifact", {
        requestId,
        bytes: packaged.zipBytes.length,
        documentFiles: packaged.documents.filter((d) => d.originalFile.includedInPackage).length,
        labFiles: packaged.labUploads.filter((d) => d.originalFile.includedInPackage).length,
      });

      await file.save(packaged.zipBytes, {
        resumable: false,
        contentType: "application/zip",
        metadata: {
          metadata: {
            requestId,
            kind: "account.export.package.v1",
            completeness: "complete",
          },
        },
      });

      const [meta] = await file.getMetadata();

      await ref.set(
        {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          incomplete: [],
          artifact: {
            bucket: exportsBucketName,
            object: objectPath,
            contentType: meta.contentType ?? "application/zip",
            size: meta.size ? Number(meta.size) : packaged.zipBytes.length,
            generation: meta.generation ?? null,
            md5Hash: meta.md5Hash ?? null,
            updated: meta.updated ?? null,
          },
        },
        { merge: true },
      );

      logger.info("account.export: completed", { requestId });
    } catch (err) {
      logger.error("account.export: failed", { requestId, err });

      const existing = (await ref.get()).data();
      if (existing?.status !== "failed") {
        await ref.set(
          {
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      throw err; // allow retry
    }
  },
);
