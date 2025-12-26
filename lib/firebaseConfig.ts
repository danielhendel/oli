// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Firebase's RN persistence helper lives in @firebase/auth internals.
 * TypeScript may not be able to resolve this path due to package "exports",
 * but Metro can at runtime once @firebase/auth is installed at the repo root.
 */
// @ts-expect-error - deep import is intentionally used for RN persistence
import * as FirebaseAuthRn from "@firebase/auth/dist/rn/index.js";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v || v.trim().length === 0) throw new Error(`Missing required env var: ${key}`);
  return v.trim();
};

const readFirebaseConfig = (): FirebaseClientConfig => {
  const apiKey = requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY");
  const authDomain = requireEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN");
  const projectId = requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID");

  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();

  return {
    apiKey,
    authDomain,
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(appId ? { appId } : {}),
  };
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

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

  // Always try initializeAuth FIRST, with RN persistence if available.
  // If already initialized elsewhere in this runtime, fall back to getAuth(app).
  try {
    const getPersistence = getReactNativePersistenceSafe();
    if (getPersistence) {
      cachedAuth = initializeAuth(app, {
        persistence: getPersistence(AsyncStorage),
      });
    } else {
      // Memory persistence fallback (should be rare with @firebase/auth installed)
      cachedAuth = initializeAuth(app);
    }
  } catch {
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
};

export const getDb = (): Firestore => {
  if (cachedDb) return cachedDb;

  const app = getFirebaseApp();
  cachedDb = getFirestore(app);

  // Ensure Auth initializes early
  void getFirebaseAuth();

  return cachedDb;
};
