// apps/mobile/lib/firebaseClient.native.ts
/**
 * Firebase client (native): iOS/Android dev & prod builds.
 * - Tries to use getReactNativePersistence (if the RN subpath exists)
 * - If not present, initializes Auth without a persistence option (memory)
 * - Exposes getFirebaseAuth/getFirestoreDb like the web client
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, type Firestore } from 'firebase/firestore';

/* ---------------- Env ---------------- */
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebaseClient(native)] Missing env ${name}`);
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
let _authInitPromise: Promise<Auth> | null = null;

/* ------------- App ------------- */
export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

/* ------------- Auth ------------- */
export function warmAuth(): Promise<Auth> {
  if (_auth) return Promise.resolve(_auth);
  if (_authInitPromise) return _authInitPromise;

  const app = getFirebaseApp();

  _authInitPromise = (async () => {
    try {
      let getRNPersist: ((store: typeof AsyncStorage) => Persistence) | undefined;
      try {
        // Dynamically load RN persistence if available
        const rnAuth = require('firebase/auth/react-native');
        getRNPersist = rnAuth?.getReactNativePersistence;
      } catch {
        getRNPersist = undefined;
      }

      if (getRNPersist) {
        _auth = initializeAuth(app, {
          persistence: getRNPersist(AsyncStorage) as unknown as Persistence,
        });
      } else {
        _auth = initializeAuth(app);
      }

      return _auth;
    } catch {
      // Already initialized (e.g. HMR)
      _auth = getAuth(app);
      return _auth;
    }
  })();

  return _authInitPromise;
}

export async function ensureAuthInitialized(): Promise<Auth> {
  return warmAuth();
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  throw new Error(
    '[firebaseClient(native)] Auth not initialized. Call ensureAuthInitialized() first.'
  );
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
  _authInitPromise = null;
}
