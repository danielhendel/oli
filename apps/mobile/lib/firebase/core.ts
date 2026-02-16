// apps/mobile/lib/firebase/core.ts
/**
 * Firebase core (Expo SDK 54, RN 0.81, React 19)
 * - Single entry for App/Auth/Firestore/Storage/Functions
 * - Native: initializeAuth with AsyncStorage persistence
 * - Web: plain getAuth
 * - Auto-connects emulators in dev/test when env flags present
 * - Idempotent across Fast Refresh
 */
import { Platform } from "react-native";
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from "firebase/functions";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

// ---------- Env (validated earlier via lib/config/env.ts) ----------
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[firebase] Missing env ${name}`);
  return v;
}

// Web config required by Firebase JS SDK on all platforms (RN uses web keys)
const config = {
  apiKey: requiredEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requiredEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  appId: requiredEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
  messagingSenderId: requiredEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  storageBucket: requiredEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
};

// ---------- Singletons ----------
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;
let _functions: Functions | undefined;
let _authInitPromise: Promise<Auth> | null = null;
let _emulatorsConnected = false;

export function app(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

async function initAuthOnce(): Promise<Auth> {
  if (_auth) return _auth;
  if (_authInitPromise) return _authInitPromise;

  const a = app();
  _authInitPromise = (async () => {
    if (Platform.OS === "web") {
      _auth = getAuth(a);
      return _auth;
    }
    try {
      const persistence = getReactNativePersistence(
        AsyncStorage
      ) as unknown as Persistence;
      _auth = initializeAuth(a, { persistence });
    } catch {
      // Already initialized (e.g., Fast Refresh)
      _auth = getAuth(a);
    }
    return _auth!;
  })();

  return _authInitPromise;
}

export async function ready(): Promise<void> {
  await initAuthOnce();

  // Lazily create other surfaces after auth warms
  if (!_db) _db = getFirestore(app());
  if (!_storage) _storage = getStorage(app());
  if (!_functions) _functions = getFunctions(app());

  // Connect emulators exactly once when env vars are present
  if (!_emulatorsConnected) {
    // Supported sources:
    //  - FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
    //  - FUNCTIONS_EMULATOR="1" + FUNCTIONS_EMULATOR_HOST="127.0.0.1:5001"
    //  - STORAGE_EMULATOR_HOST="127.0.0.1:9199"
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
      connectFirestoreEmulator(_db!, host, Number(portStr));
    }
    if (process.env.FUNCTIONS_EMULATOR && process.env.FUNCTIONS_EMULATOR_HOST) {
      const [fh, fp] = process.env.FUNCTIONS_EMULATOR_HOST.split(":");
      connectFunctionsEmulator(_functions!, fh, Number(fp));
    }
    if (process.env.STORAGE_EMULATOR_HOST) {
      const [sh, sp] = process.env.STORAGE_EMULATOR_HOST.split(":");
      connectStorageEmulator(_storage!, sh, Number(sp));
    }
    _emulatorsConnected = true;
  }
}

export function auth(): Auth {
  if (_auth) return _auth;
  throw new Error("[firebase] auth() called before ready(). Call await ready() first.");
}

export function db(): Firestore {
  if (_db) return _db;
  _db = getFirestore(app());
  return _db;
}

export function storage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(app());
  return _storage;
}

export function functions(): Functions {
  if (_functions) return _functions;
  _functions = getFunctions(app());
  return _functions;
}

// Optional: quick probe for Dev Console / tests
export async function probe(): Promise<{ appId: string; uid?: string }> {
  await ready();
  const appId = app().options.appId!;
  const uid = auth().currentUser?.uid;
  // Respect exactOptionalPropertyTypes by omitting uid when undefined
  return uid ? { appId, uid } : { appId };
}
