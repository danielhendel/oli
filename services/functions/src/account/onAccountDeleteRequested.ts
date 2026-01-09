import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const TOPIC = "account.delete.v1";

type AccountDeleteMessage = {
  uid: string;
  requestId?: string;
  requestedAt?: string;
};

const assertUid = (uid: unknown): uid is string =>
  typeof uid === "string" && uid.trim().length > 0;

function deletionDocRef(db: FirebaseFirestore.Firestore, uid: string, requestId: string) {
  return db
    .collection("users")
    .doc(uid)
    .collection("accountDeletion")
    .doc(requestId);
}

async function deleteUserFirestoreSubtree(db: FirebaseFirestore.Firestore, uid: string) {
  const userRef = db.collection("users").doc(uid);

  // ✅ Verified: profile exists (functions index writes users/{uid}/profile/general)
  const collections = [
    "profile",
    "rawEvents",
    "events",
    "dailyFacts",
    "insights",
    "intelligenceContext",
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

/**
 * Account deletion executor
 *
 * Guarantees:
 * - user-scoped writes only
 * - idempotent (safe retries)
 * - observable lifecycle state
 */
export const onAccountDeleteRequested = onMessagePublished(TOPIC, async (event) => {
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
    { merge: true }
  );

  try {
    logger.info("account.delete: deleting firestore subtree", { uid, requestId });
    await deleteUserFirestoreSubtree(db, uid);

    logger.info("account.delete: deleting auth user", { uid, requestId });
    await deleteAuthUser(uid);

    await ref.set(
      {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
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
      { merge: true }
    );

    throw err; // let Pub/Sub retry
  }
});
