// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client configuration.
 * Uses EXPO_PUBLIC_* variables (safe for client-side use).
 * Enforces single initialization and strict typing.
 */

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const readFirebaseConfig = (): FirebaseClientConfig => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Missing Firebase env vars. Set EXPO_PUBLIC_FIREBASE_API_KEY, " +
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_PROJECT_ID."
    );
  }

  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  // exactOptionalPropertyTypes-safe:
  // only include optional keys when they are defined
  return {
    apiKey,
    authDomain,
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(appId ? { appId } : {})
  };
};

const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length > 0) {
    return getApp();
  }

  const config = readFirebaseConfig();
  return initializeApp(config);
};

export const getDb = (): Firestore => {
  const app = getFirebaseApp();
  return getFirestore(app);
};
