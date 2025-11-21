import * as admin from 'firebase-admin';
// ⬅️ Pull the v1 API explicitly so `.auth.user().onCreate` exists.
import * as functionsV1 from 'firebase-functions/v1';

try {
  admin.app();
} catch {
  admin.initializeApp();
}

const db = admin.firestore();

function defaultGeneralProfile(user: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  return {
    displayName: user.displayName ?? null,
    firstName: null as string | null,
    lastName: null as string | null,
    avatarUrl: null as string | null,
    email: user.email ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

// v1 Auth trigger (stable and supported in firebase-functions v6)
export const onAuthCreate = functionsV1.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  await db
    .doc(`users/${uid}/profile/general`)
    .set(defaultGeneralProfile(user), { merge: true });
});
