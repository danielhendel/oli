// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

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

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length > 0) return getApp();
  return initializeApp(readFirebaseConfig());
};

export const getFirebaseAuth = (): Auth => {
  if (cachedAuth) return cachedAuth;

  const app = getFirebaseApp();

  try {
    cachedAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
};

export const getDb = (): Firestore => {
  if (cachedDb) return cachedDb;
  const app = getFirebaseApp();
  cachedDb = getFirestore(app);
  void getFirebaseAuth();
  return cachedDb;
};
