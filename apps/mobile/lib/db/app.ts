// File: apps/mobile/lib/db/app.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

let _app: FirebaseApp | undefined;

/**
 * Initialize Firebase exactly once.
 * Reads config from EXPO_PUBLIC_* envs (or your existing env loader).
 */
export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;

  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  // getApps()[0] is FirebaseApp | undefined — handle with nullish coalescing
  _app = getApps()[0] ?? initializeApp(firebaseConfig);
  return _app;
}
