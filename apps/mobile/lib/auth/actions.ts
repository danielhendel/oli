// apps/mobile/lib/auth/actions.ts
/**
 * Purpose: Centralized, typed Auth actions (no Firebase calls from screens).
 * Inputs: email/password (string), or provider (future).
 * Side-effects: Firebase Auth (ensured with ensureAuthInitialized()).
 * Errors: Thrown; screens map via mapFirebaseError().
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { ensureAuthInitialized, getFirebaseAuth } from '@/lib/firebaseClient';

export async function signUpEmailPassword(email: string, password: string): Promise<void> {
  if (!email || !password) throw new Error('auth/invalid-argument');
  const auth = await ensureAuthInitialized();
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signInEmailPassword(email: string, password: string): Promise<void> {
  if (!email || !password) throw new Error('auth/invalid-argument');
  const auth = await ensureAuthInitialized();
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}

/** Stubs for social providers (wired in a later sprint). */
export async function signInWithApple(): Promise<never> {
  throw new Error('auth/operation-not-supported-in-this-environment');
}

export async function signInWithGoogle(): Promise<never> {
  throw new Error('auth/operation-not-supported-in-this-environment');
}
