import Constants from "expo-constants";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

type FirebaseExtra = {
  firebase?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  useEmulators?: boolean;
  emulatorHost?: string; // default 'localhost'
};

function readExtra(): FirebaseExtra {
  // Shape-safe access to Expo config in both new and legacy environments
  const c = Constants as unknown as {
    expoConfig?: { extra?: unknown };
    manifest?: { extra?: unknown };
  };

  const rawExtra = c.expoConfig?.extra ?? c.manifest?.extra ?? {};
  if (typeof rawExtra !== "object" || rawExtra === null) return {};

  const obj = rawExtra as Record<string, unknown>;
  const firebaseRaw = obj.firebase as Record<string, unknown> | undefined;

  let firebase: FirebaseExtra["firebase"];
  if (firebaseRaw && typeof firebaseRaw === "object") {
    // Build without undefined values to satisfy exactOptionalPropertyTypes
    const fb: NonNullable<FirebaseExtra["firebase"]> = {};
    if (typeof firebaseRaw.apiKey === "string") fb.apiKey = firebaseRaw.apiKey;
    if (typeof firebaseRaw.authDomain === "string") fb.authDomain = firebaseRaw.authDomain;
    if (typeof firebaseRaw.projectId === "string") fb.projectId = firebaseRaw.projectId;
    if (typeof firebaseRaw.storageBucket === "string") fb.storageBucket = firebaseRaw.storageBucket;
    if (typeof firebaseRaw.messagingSenderId === "string")
      fb.messagingSenderId = firebaseRaw.messagingSenderId;
    if (typeof firebaseRaw.appId === "string") fb.appId = firebaseRaw.appId;
    if (Object.keys(fb).length) firebase = fb; // only set if at least one key exists
  }

  const useEmulators =
    typeof obj.useEmulators === "boolean" ? (obj.useEmulators as boolean) : undefined;
  const emulatorHost =
    typeof obj.emulatorHost === "string" ? (obj.emulatorHost as string) : undefined;

  // IMPORTANT: Omit optional props when undefined to satisfy exactOptionalPropertyTypes
  const out: FirebaseExtra = {};
  if (firebase) out.firebase = firebase;
  if (useEmulators !== undefined) out.useEmulators = useEmulators;
  if (emulatorHost !== undefined) out.emulatorHost = emulatorHost;
  return out;
}

const extra = readExtra();
const cfgFromExtra = extra.firebase ?? {};

function isPlaceholder(v?: string) {
  return !!v && /^\$\{.+\}$/.test(v);
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? cfgFromExtra.apiKey ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? cfgFromExtra.authDomain ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? cfgFromExtra.projectId ?? "",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? cfgFromExtra.storageBucket ?? "",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? cfgFromExtra.messagingSenderId ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? cfgFromExtra.appId ?? "",
};

function hasValidConfig() {
  return Object.values(firebaseConfig).every(
    (v) => typeof v === "string" && v.length > 0 && !isPlaceholder(v),
  );
}

// Singletons
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let emulatorsConnected = false;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!hasValidConfig()) {
    console.warn(
      "[firebase] Missing Firebase config. Set EXPO_PUBLIC_FIREBASE_* env vars or expo.extra.firebase in app.json.",
    );
  }
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getAuthInstance(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  maybeConnectEmulators();
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  maybeConnectEmulators();
  return db;
}

export function getStorageInstance(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  maybeConnectEmulators();
  return storage;
}

function maybeConnectEmulators() {
  if (emulatorsConnected) return;
  const useEmulators =
    (typeof extra.useEmulators === "boolean" ? extra.useEmulators : undefined) ??
    (process.env.EXPO_PUBLIC_USE_EMULATORS === "true" ? true : undefined) ??
    false;

  if (!useEmulators) return;

  const host = extra.emulatorHost ?? "localhost";
  try {
    const a = auth ?? getAuth(getFirebaseApp());
    connectAuthEmulator(a, `http://${host}:9099`, { disableWarnings: true });
  } catch (e) {
    console.warn("[firebase] Auth emulator connect skipped:", (e as Error).message);
  }
  try {
    const f = db ?? getFirestore(getFirebaseApp());
    connectFirestoreEmulator(f, host, 8080);
  } catch (e) {
    console.warn("[firebase] Firestore emulator connect skipped:", (e as Error).message);
  }
  try {
    const s = storage ?? getStorage(getFirebaseApp());
    connectStorageEmulator(s, host, 9199);
  } catch (e) {
    console.warn("[firebase] Storage emulator connect skipped:", (e as Error).message);
  }
  emulatorsConnected = true;
}
