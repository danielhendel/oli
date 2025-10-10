// apps/mobile/lib/firebaseClient.ts
/**
 * Canonical, race-safe Firebase app & Auth initialization for Expo (web + native).
 * - NO imports from 'firebase/auth/react-native' (Metro-safe)
 * - Provides RN persistence via a tiny AsyncStorage-backed adapter
 * - Guards misuse on native if ensureAuthInitialized() wasn't called first
 */

import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebaseClient] Missing env ${name}`);
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

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _authInitPromise: Promise<Auth> | null = null;

/**
 * Minimal AsyncStorage-backed persistence for React Native.
 * Matches Firebase's Persistence contract; listeners are no-ops because
 * AsyncStorage doesn't broadcast cross-context updates by itself.
 */
function createRNAsyncStoragePersistence(): Persistence {
  type Listener = (key: string, value: string | null) => void;
  const listeners = new Set<Listener>();

  const persistenceLike = {
    type: 'LOCAL',
    _isAvailable: async () => true,
    _set: async (key: string, value: string) => {
      await AsyncStorage.setItem(key, value);
      for (const l of listeners) l(key, value);
    },
    _get: async (key: string) => {
      return AsyncStorage.getItem(key);
    },
    _remove: async (key: string) => {
      await AsyncStorage.removeItem(key);
      for (const l of listeners) l(key, null);
    },
    _addListener: (listener: Listener) => {
      listeners.add(listener);
    },
    _removeListener: (listener: Listener) => {
      listeners.delete(listener);
    },
  };

  // The Persistence type isn't structural in public types; we cast here intentionally.
  return persistenceLike as unknown as Persistence;
}

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

/** Warm and register Firebase Auth (idempotent across fast refresh) */
export function warmAuth(): Promise<Auth> {
  if (_auth) return Promise.resolve(_auth);
  if (_authInitPromise) return _authInitPromise;

  const app = getFirebaseApp();

  _authInitPromise = (async () => {
    if (Platform.OS === 'web') {
      _auth = getAuth(app);
      return _auth;
    }

    try {
      const rnPersistence = createRNAsyncStoragePersistence();
      _auth = initializeAuth(app, { persistence: rnPersistence });
      return _auth;
    } catch {
      // Already initialized (e.g., HMR) — just retrieve it.
      _auth = getAuth(app);
      return _auth;
    }
  })();

  return _authInitPromise;
}

export async function ensureAuthInitialized(): Promise<Auth> {
  return warmAuth();
}

/** Synchronous accessor after ensureAuthInitialized() */
export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  if (Platform.OS !== 'web') {
    throw new Error('[firebaseClient] Auth not initialized. Call ensureAuthInitialized() first.');
  }
  return getAuth(getFirebaseApp());
}
