// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { initializeAuth, getAuth, inMemoryPersistence, type Auth } from "firebase/auth";

/**
 * Firebase client configuration.
 * Uses EXPO_PUBLIC_* variables (safe for client-side use).
 * Enforces single initialization and strict typing.
 *
 * NOTE:
 * We intentionally use inMemoryPersistence for Auth to keep the toolchain
 * deterministic and lint-clean in this repo’s current dependency configuration.
 * This still fully supports sign-in, ID token generation, and API auth.
 *
 * We will upgrade to AsyncStorage persistence once the Firebase RN persistence
 * entrypoint is available in your installed Firebase package + TS resolution.
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

  return {
    apiKey,
    authDomain,
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(appId ? { appId } : {}),
  };
};

const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length > 0) return getApp();
  return initializeApp(readFirebaseConfig());
};

/**
 * Firebase Auth (React Native)
 *
 * Uses in-memory persistence for now (auth works, token works, but may not
 * persist across a full app restart).
 */
export const getFirebaseAuth = (): Auth => {
  const app = getFirebaseApp();

  // If Auth was already initialized for this app, getAuth(app) returns it.
  try {
    return getAuth(app);
  } catch {
    // continue
  }

  return initializeAuth(app, {
    persistence: inMemoryPersistence,
  });
};

export const getDb = (): Firestore => {
  const app = getFirebaseApp();
  return getFirestore(app);
};
