// functions/index.js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
// ✅ Use the v1 namespace explicitly with v6+: 
const functions = require('firebase-functions/v1');

initializeApp({ credential: applicationDefault() });

/**
 * createUserProfile
 * Bootstraps a minimal profile doc whenever a Firebase Auth user is created.
 * Path: users/{uid}/profile/general
 */
exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
  const db = getFirestore();
  const ref = db.doc(`users/${user.uid}/profile/general`);
  await ref.set(
    {
      uid: user.uid,
      email: user.email ?? '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      profileVersion: '1.0',
    },
    { merge: true }
  );
});
