/**
 * Phase 1 Lock #6 — Emulator-safe export executor for E2E tests.
 *
 * Runs in tests without GCS or Pub/Sub. Updates the job doc at
 * users/{uid}/accountExports/{exportId} (same path the API creates).
 *
 * Lifecycle: queued → running → succeeded | failed
 * Artifact: stored in Firestore subcollection (no GCS).
 */
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTIONS = ["rawEvents", "events", "dailyFacts", "insights", "intelligenceContext"] as const;

async function readCollectionAll(
  db: Firestore,
  path: string,
): Promise<Record<string, unknown>[]> {
  const snap = await db.collection(path).get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
}

export type RunExportJobForTestArgs = {
  db: Firestore;
  userId: string;
  exportId: string;
};

/**
 * Process an export job that was created by POST /export.
 * Idempotent: if already succeeded, no-op.
 */
export async function runExportJobForTest(args: RunExportJobForTestArgs): Promise<void> {
  const { db, userId, exportId } = args;

  const jobRef = db.collection("users").doc(userId).collection("accountExports").doc(exportId);

  const snap = await jobRef.get();
  if (!snap.exists) {
    throw new Error(`Export job not found: users/${userId}/accountExports/${exportId}`);
  }

  const data = snap.data() as Record<string, unknown> | undefined;
  const status = typeof data?.status === "string" ? data.status : "unknown";

  if (status === "succeeded") {
    return; // Idempotent
  }

  // Mark running
  await jobRef.set(
    {
      status: "running",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    const profileGeneralSnap = await db.doc(`users/${userId}/profile/general`).get();
    const profileGeneral = profileGeneralSnap.exists ? profileGeneralSnap.data() : null;

    const collectionsData: Record<string, Record<string, unknown>[]> = {};
    for (const col of COLLECTIONS) {
      collectionsData[col] = await readCollectionAll(db, `users/${userId}/${col}`);
    }

    const artifactPayload = {
      schemaVersion: 1,
      kind: "account.export.v1",
      uid: userId,
      requestId: exportId,
      requestedAt: data?.requestedAt ?? null,
      generatedAt: new Date().toISOString(),
      data: {
        profile: { general: profileGeneral },
        collections: collectionsData,
      },
    };

    const bodyStr = JSON.stringify(artifactPayload);
    const sizeBytes = Buffer.byteLength(bodyStr, "utf8");

    const artifactId = `${exportId}_artifact`;
    const artifactRef = jobRef.collection("artifacts").doc(artifactId);

    await artifactRef.set({
      artifactId,
      contentType: "application/json; charset=utf-8",
      sizeBytes,
      schemaVersion: 1,
      payload: artifactPayload,
    });

    await jobRef.set(
      {
        status: "succeeded",
        artifact: {
          artifactId,
          contentType: "application/json; charset=utf-8",
          sizeBytes,
          schemaVersion: 1,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    await jobRef.set(
      {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    throw err;
  }
}
