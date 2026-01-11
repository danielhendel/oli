// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getEnv } from "./env";

/**
 * Firebase's RN persistence helper lives in @firebase/auth internals.
 * TypeScript may not be able to resolve this path due to package "exports",
 * but Metro can at runtime once @firebase/auth is installed at the repo root.
 *
 * IMPORTANT:
 * - Do NOT use @ts-expect-error here: it will fail when TS *doesn't* error.
 * - Use @ts-ignore instead, since the deep import may or may not be type-resolvable
 *   depending on Firebase package/export changes.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - deep import is intentionally used for RN persistence
import * as FirebaseAuthRn from "@firebase/auth/dist/rn/index.js";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

const readFirebaseConfig = (): FirebaseClientConfig => {
  const env = getEnv(); // FAIL FAST if anything is misconfigured

  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
};

const getReactNativePersistenceSafe = (): ((storage: unknown) => Persistence) | null => {
  const maybe = (FirebaseAuthRn as unknown as { getReactNativePersistence?: (s: unknown) => Persistence })
    .getReactNativePersistence;

  return typeof maybe === "function" ? maybe : null;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (cachedApp) return cachedApp;

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(readFirebaseConfig());
  return cachedApp;
};

export const getFirebaseAuth = (): Auth => {
  if (cachedAuth) return cachedAuth;

  const app = getFirebaseApp();
  const getPersist = getReactNativePersistenceSafe();

  // Prefer initializeAuth + RN persistence (so Auth survives app restarts)
  if (getPersist) {
    cachedAuth = initializeAuth(app, { persistence: getPersist(AsyncStorage) });
    return cachedAuth;
  }

  // Fallback: default web auth (should be rare)
  cachedAuth = getAuth(app);
  return cachedAuth;
};

export const getFirestoreDb = (): Firestore => {
  if (cachedDb) return cachedDb;

  const app = getFirebaseApp();
  cachedDb = getFirestore(app);
  return cachedDb;
};
