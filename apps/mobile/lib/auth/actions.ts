// apps/mobile/lib/auth/actions.ts
/**
 * Purpose: Centralized, typed Auth actions (no Firebase calls from screens).
 * Inputs: email/password (string).
 * Side-effects: Firebase Auth (via ensureAuthInitialized()).
 * Errors: Thrown; screens map via mapFirebaseAuthError().
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { ensureAuthInitialized, getFirebaseAuth } from '@/lib/firebaseClient';

/**
 * Creates a new user with email/password.
 * Trims email; throws Firebase Auth errors for caller to map.
 */
export async function signUpEmailPassword(email: string, password: string): Promise<void> {
  const e = email?.trim();
  if (!e || !password) throw new Error('auth/invalid-argument');
  const auth = await ensureAuthInitialized();
  await createUserWithEmailAndPassword(auth, e, password);
}

/**
 * Signs in an existing user with email/password.
 * Trims email; throws Firebase Auth errors for caller to map.
 */
export async function signInEmailPassword(email: string, password: string): Promise<void> {
  const e = email?.trim();
  if (!e || !password) throw new Error('auth/invalid-argument');
  const auth = await ensureAuthInitialized();
  await signInWithEmailAndPassword(auth, e, password);
}

/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}

/* Note:
   Social providers (Apple, Google) are implemented via dedicated UI components
   that perform their own native/AuthSession flows and hand off to Firebase.
   Keeping them out of this module prevents accidental imports and keeps
   boundaries clean per the Great Code Standard.
*/
