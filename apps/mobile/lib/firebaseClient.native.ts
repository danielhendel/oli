// apps/mobile/lib/firebaseClient.native.ts
/**
 * Firebase client (native): iOS/Android dev & EAS builds.
 *
 * For now we intentionally mirror the web client behavior:
 * - Use the default Auth instance via getAuth(getFirebaseApp()).
 * - No React Native persistence (sessions are in-memory only).
 *
 * This keeps things simple and avoids the “Component auth has not
 * been registered yet” issues while we’re still in Sprint 1.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/* ---------------- Env ---------------- */
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[firebaseClient(native)] Missing env ${name}`);
  }
  return v;
}

const firebaseConfig = {
  apiKey: requiredEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requiredEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: requiredEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  messagingSenderId: requiredEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  storageBucket: requiredEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
};

/* ------------- Singletons ------------- */
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

/* ------------- App ------------- */
export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

/* ------------- Auth ------------- */
export async function warmAuth(): Promise<Auth> {
  if (_auth) return _auth;

  // Native dev / EAS build: use the default Auth instance, same as web.
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export async function ensureAuthInitialized(): Promise<Auth> {
  return warmAuth();
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  // Safe fallback if a caller forgot to await ensureAuthInitialized
  return getAuth(getFirebaseApp());
}

/* ----------- Firestore ----------- */
export function getFirestoreDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

/* -------- Test helper -------- */
export function __resetFirebaseClientForTests__(): void {
  _app = undefined;
  _auth = undefined;
  _db = undefined;
}
