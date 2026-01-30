// services/api/src/db/derivedLedger.ts
import { db, userCollection } from "../db";

// Firestore-reserved field name for document ID (avoids importing FieldPath / firebase-admin)
const DOC_ID_FIELD = "__name__";

/**
 * Detect whether a derived ledger runId exists under a different user.
 *
 * Run paths:
 *   users/{userId}/derivedLedger/{day}/runs/{runId}
 */
export async function derivedLedgerRunIdExistsForOtherUser(params: {
  uid: string;
  runId: string;
}): Promise<boolean> {
  const { uid, runId } = params;

  const q = db.collectionGroup("runs").where(DOC_ID_FIELD, "==", runId).limit(3);
  const snap = await q.get();
  if (snap.empty) return false;

  for (const d of snap.docs) {
    // Expect: users/{userId}/derivedLedger/{day}/runs/{runId}
    const parts = d.ref.path.split("/");
    const userIdx = parts.indexOf("users");
    const foundUid = userIdx >= 0 && parts.length > userIdx + 1 ? parts[userIdx + 1] : null;
    if (foundUid && foundUid !== uid) return true;
  }

  return false;
}

/**
 * Fetch a user's derived ledger day pointer doc.
 */
export async function getDerivedLedgerDayPointer(params: {
  uid: string;
  day: string;
}): Promise<{ ok: true; data: FirebaseFirestore.DocumentData } | { ok: false; code: "NOT_FOUND" }> {
  const { uid, day } = params;
  const ref = userCollection(uid, "derivedLedger").doc(day);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "NOT_FOUND" };
  return { ok: true, data: snap.data() as FirebaseFirestore.DocumentData };
}
