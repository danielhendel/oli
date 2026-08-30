/**
 * Account deletion API helpers (Cloud Run).
 */

import type { DeleteStatusResponseDto } from "@oli/contracts";
import {
  coerceDeleteBackendStatus,
  firestoreTimestampToIso,
  normalizeDeleteStatus,
} from "../../../../../lib/data/user-data/accountDeletion/normalizeDeleteStatus";
import { globalAccountDeletionDocId } from "../../../../../lib/data/user-data/accountDeletionFirestoreCollections";
import { db, FieldValue } from "../../db";

const ACCOUNT_DELETIONS_GLOBAL = "accountDeletions";

export type UserDeletionDoc = Record<string, unknown>;

export async function loadLatestUserDeletionDoc(uid: string): Promise<{
  requestId: string;
  data: UserDeletionDoc;
} | null> {
  try {
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("accountDeletion")
      .orderBy("requestedAt", "desc")
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0]!;
      return { requestId: doc.id, data: doc.data() as UserDeletionDoc };
    }
  } catch {
    // Missing index — fall through to scan.
  }

  const all = await db.collection("users").doc(uid).collection("accountDeletion").get();
  if (all.empty) return null;

  let best: { requestId: string; data: UserDeletionDoc; score: number } | null = null;
  for (const doc of all.docs) {
    const data = doc.data() as UserDeletionDoc;
    const requestedAt = typeof data.requestedAt === "string" ? data.requestedAt : null;
    const updatedAt = firestoreTimestampToIso(data.updatedAt);
    const t = Date.parse(requestedAt ?? updatedAt ?? "") || 0;
    if (!best || t > best.score) {
      best = { requestId: doc.id, data, score: t };
    }
  }
  return best ? { requestId: best.requestId, data: best.data } : null;
}

export async function loadUserDeletionDoc(
  uid: string,
  requestId: string,
): Promise<UserDeletionDoc | null> {
  const userSnap = await db
    .collection("users")
    .doc(uid)
    .collection("accountDeletion")
    .doc(requestId)
    .get();
  if (userSnap.exists) return userSnap.data() as UserDeletionDoc;

  const globalId = globalAccountDeletionDocId(uid, requestId);
  const globalSnap = await db.collection(ACCOUNT_DELETIONS_GLOBAL).doc(globalId).get();
  if (!globalSnap.exists) return null;
  return globalSnap.data() as UserDeletionDoc;
}

export function buildDeleteStatusDto(
  requestId: string,
  data: UserDeletionDoc,
): Omit<DeleteStatusResponseDto, "ok"> {
  const backendStatus = coerceDeleteBackendStatus(data.status);
  const requestedAt = typeof data.requestedAt === "string" ? data.requestedAt : null;
  const completedAt = firestoreTimestampToIso(data.completedAt);
  const updatedAt = firestoreTimestampToIso(data.updatedAt);
  const startedAt = firestoreTimestampToIso(data.startedAt);

  const normalized = normalizeDeleteStatus({
    backendStatus,
    requestedAt,
    completedAt,
    updatedAt,
    startedAt,
  });

  return {
    requestId,
    status: normalized.status,
    backendStatus,
    requestedAt,
    updatedAt,
    completedAt,
    retryable: normalized.retryable,
    failureCategory: normalized.failureCategory,
  };
}

/** True when the latest request is still actively pending (not stale). */
export function isActivePendingDeletion(data: UserDeletionDoc): boolean {
  const dto = buildDeleteStatusDto("probe", data);
  return dto.status === "queued" || dto.status === "processing";
}

export async function markUserDeletionFailed(
  uid: string,
  requestId: string,
  errorCode: string,
): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .collection("accountDeletion")
    .doc(requestId)
    .set(
      {
        status: "failed",
        error: errorCode,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function createUserDeletionRequestDoc(args: {
  uid: string;
  requestId: string;
  requestedAt: string;
}): Promise<void> {
  const { uid, requestId, requestedAt } = args;
  await db
    .collection("users")
    .doc(uid)
    .collection("accountDeletion")
    .doc(requestId)
    .set(
      {
        uid,
        requestId,
        requestedAt,
        status: "queued",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    );
}
