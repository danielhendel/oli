import { onUserCreated } from 'firebase-functions/v2/identity';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Bootstrap a minimal profile doc so the client never has to "create" it.
 * Path matches your DAL/paths: users/{uid}/profile/general
 */
export const createUserProfile = onUserCreated(async (event) => {
  const user = event.data;
  const db = getFirestore();
  const ref = db.doc(`users/${user.uid}/profile/general`);

  await ref.set(
    {
      uid: user.uid,
      // mirror common identity fields for convenience:
      email: user.email ?? '',
      // your ProfileGeneral supports optional sex/dateOfBirth/heightCm/weightKg:
      // we do not set them here (client fills in).
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      profileVersion: '1.0'
    },
    { merge: true }
  );
});
