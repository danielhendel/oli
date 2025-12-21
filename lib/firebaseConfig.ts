// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import * as AuthMod from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

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

type GetReactNativePersistenceFn = (storage: unknown) => unknown;

const getBestAuthPersistence = (): unknown => {
  // Some firebase versions export getReactNativePersistence at runtime,
  // but TS types may not include it. Probe safely.
  const maybe = (AuthMod as unknown as { getReactNativePersistence?: GetReactNativePersistenceFn })
    .getReactNativePersistence;

  if (typeof maybe === "function") {
    return maybe(ReactNativeAsyncStorage);
  }

  // Fallback: works but does not persist across full app restarts.
  return AuthMod.inMemoryPersistence;
};

/**
 * Firebase Auth (React Native)
 *
 * We prefer AsyncStorage persistence when available, otherwise fall back
 * to in-memory persistence (still supports login + ID tokens).
 *
 * IMPORTANT: initializeAuth must be called once per app instance.
 */
export const getFirebaseAuth = (): AuthMod.Auth => {
  const app = getFirebaseApp();

  // If Auth was already initialized for this app, getAuth(app) returns it.
  try {
    return AuthMod.getAuth(app);
  } catch {
    // continue and initialize
  }

  return AuthMod.initializeAuth(app, {
    persistence: getBestAuthPersistence() as AuthMod.Persistence,
  });
};

export const getDb = (): Firestore => {
  const app = getFirebaseApp();
  return getFirestore(app);
};
