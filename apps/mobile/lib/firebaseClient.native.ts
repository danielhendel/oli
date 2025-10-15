// apps/mobile/lib/firebaseClient.native.ts
/**
 * Firebase app & Auth init for React Native (Expo).
 * - Uses Web config (required for RN Firebase Web SDK)
 * - AsyncStorage persistence via getReactNativePersistence from 'firebase/auth'
 * - Race-safe, idempotent across Fast Refresh
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import * as AuthMod from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---- Env helpers ----
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebaseClient] Missing env ${name}`);
  return v;
}

// Read EXPO_PUBLIC_* so values are available at runtime in RN
const firebaseConfig = {
  apiKey: requiredEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requiredEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: requiredEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  messagingSenderId: requiredEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  storageBucket: requiredEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
};

function assertWebConfigShape(cfg: typeof firebaseConfig) {
  const apiKeyOk = /^AIza[0-9A-Za-z_-]{35}$/.test(cfg.apiKey);
  const appIdOk = /^1:\d+:web:[0-9a-f]+$/i.test(cfg.appId);

  if (!apiKeyOk || !appIdOk) {
    throw new Error(
      [
        '[firebaseClient] Invalid Firebase Web config.',
        `apiKey: ${apiKeyOk ? 'OK' : 'INVALID'}`,
        `appId: ${appIdOk ? 'OK' : 'INVALID (must contain ":web:")'}`,
        'Use Web app credentials from Firebase Console → Project settings → Your apps (</>).',
      ].join(' ')
    );
  }
}

// ---- Singletons ----
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _authInitPromise: Promise<Auth> | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  assertWebConfigShape(firebaseConfig);
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

/** Initialize Firebase Auth once with RN persistence. */
async function initAuthOnce(app: FirebaseApp): Promise<Auth> {
  if (_auth) return _auth;
  if (_authInitPromise) return _authInitPromise;

  _authInitPromise = (async () => {
    try {
      const getReactNativePersistence =
        (AuthMod as unknown as { getReactNativePersistence?: (s: unknown) => unknown })
          .getReactNativePersistence;

      if (typeof getReactNativePersistence !== 'function') {
        throw new Error(
          "[firebaseClient] getReactNativePersistence not found on 'firebase/auth'. " +
            'Ensure firebase >= 11 and @react-native-async-storage/async-storage is installed.'
        );
      }

      const persistence = getReactNativePersistence(AsyncStorage) as unknown as Persistence;
      _auth = AuthMod.initializeAuth(app, { persistence });
      return _auth;
    } catch {
      _auth = AuthMod.getAuth(app);
      return _auth;
    }
  })();

  return _authInitPromise;
}

/** Public accessor: auto-initialize on first call (race-safe). */
export function auth(): Auth {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  void initAuthOnce(app);
  if (!_auth) {
    throw new Error(
      '[firebaseClient] Auth not yet initialized. Call ensureAuthInitialized() during app bootstrap.'
    );
  }
  return _auth;
}

/** Optional awaitable guard for app bootstrap. */
export async function ensureAuthInitialized(): Promise<Auth> {
  const app = getFirebaseApp();
  return initAuthOnce(app);
}

/** Back-compat shim: keep old API used by AuthProvider. */
export function ready(): Promise<Auth> {
  const app = getFirebaseApp();
  return initAuthOnce(app);
}
