// apps/mobile/lib/db/index.ts
/**
 * Firestore entrypoint for the app.
 * - Delegates all initialization to lib/firebaseClient
 * - Exposes a typed, cached Firestore instance
 * - Provides simple typed path builders
 */

import { type Firestore } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebaseClient';

// Single, cached Firestore instance (via centralized client)
export const db: Firestore = getFirestoreDb();

// Typed helpers
export type Uid = string;

export const col = {
  users: () => 'users',
  userProfile: (uid: Uid) => `users/${uid}/profile`,
};

// Optional guard you can use in callers before accessing user paths
export function assertUid(uid: string | null | undefined): asserts uid is Uid {
  if (!uid) throw new Error('UID is required for this operation.');
}
