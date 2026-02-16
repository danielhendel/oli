// services/functions/src/firebaseAdmin.ts
import * as admin from 'firebase-admin';
try {
    // Reuse existing app if already initialized (cold start vs warm start).
    admin.app();
}
catch {
    admin.initializeApp();
}
/**
 * Shared firebase-admin instance for all Cloud Functions.
 */
export { admin };
/**
 * Shared Firestore reference.
 */
export const db = admin.firestore();
