// lib/users/provision.ts
/**
 * Purpose: Ensure a Firestore user doc exists on first sign-in and
 * touch updatedAt on subsequent logins. Non-blocking, idempotent.
 * Inputs: uid (required), optional email/displayName for initial write
 * Side-effects: Firestore write
 * Errors: Throws on invalid uid; otherwise propagates Firestore errors to caller
 */

import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

export type UserDoc = {
  email?: string | null;
  displayName?: string | null;
  profileVersion: number;
  onboarding: { status: "empty" | "started" | "complete" };
  privacy: { policyAcceptedAt?: FirebaseFirestoreTypes.Timestamp | null };
  createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
  updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
};

function serverTS() {
  return firestore.FieldValue.serverTimestamp() as FirebaseFirestoreTypes.Timestamp;
}

/**
 * Creates /users/{uid} if it doesn't exist; otherwise only updates updatedAt.
 * Safe to call on every sign-in.
 */
export async function ensureUserProvisioned(
  uid: string,
  extra?: { email?: string | null; displayName?: string | null },
): Promise<void> {
  if (!uid) throw new Error("ensureUserProvisioned: missing uid");

  const ref = firestore().collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const doc: UserDoc = {
      email: extra?.email ?? null,
      displayName: extra?.displayName ?? null,
      profileVersion: 1,
      onboarding: { status: "empty" },
      privacy: { policyAcceptedAt: null },
      createdAt: serverTS(),
      updatedAt: serverTS(),
    };
    await ref.set(doc, { merge: false });
  } else {
    await ref.set({ updatedAt: serverTS() }, { merge: true });
  }
}
