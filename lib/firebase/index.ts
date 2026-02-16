// lib/firebase/index.ts
import {
  getApps,
  getApp,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import Constants from "expo-constants";

type FirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

type Extra = {
  firebase?: FirebaseExtra;
  useEmulators?: boolean;
  /** Optional: override emulator host (e.g., "127.0.0.1" or "10.0.2.2") */
  emulatorHost?: string;
  /** Optional: override Firestore emulator port (default 8081 in this app) */
  firestoreEmulatorPort?: number;
};

function readExtra(): Extra {
  const c = Constants as unknown as {
    expoConfig?: { extra?: Extra };
    manifest?: { extra?: Extra };
  };
  return c.expoConfig?.extra ?? c.manifest?.extra ?? {};
}

const extra = readExtra();
const fb = extra.firebase ?? {};
const useEmu = !!extra.useEmulators;

function buildOptions(): FirebaseOptions {
  if (useEmu) {
    // Dev/emulator-friendly defaults if missing
    const apiKey = fb.apiKey ?? "dev-api-key";
    const projectId = fb.projectId ?? "demo-oli";
    const appId = fb.appId ?? "dev-app-id";
    const base: FirebaseOptions = { apiKey, projectId, appId };
    return {
      ...base,
      ...(fb.authDomain ? { authDomain: fb.authDomain } : { authDomain: "localhost" }),
      ...(fb.storageBucket ? { storageBucket: fb.storageBucket } : {}),
      ...(fb.messagingSenderId ? { messagingSenderId: fb.messagingSenderId } : {}),
    };
  }

  // Production: require real values
  if (!fb.apiKey || !fb.projectId || !fb.appId) {
    throw new Error(
      "Missing Firebase config. In app.json -> expo.extra.firebase set apiKey, projectId, and appId.",
    );
  }
  const base: FirebaseOptions = {
    apiKey: fb.apiKey,
    projectId: fb.projectId,
    appId: fb.appId,
  };
  return {
    ...base,
    ...(fb.authDomain ? { authDomain: fb.authDomain } : {}),
    ...(fb.storageBucket ? { storageBucket: fb.storageBucket } : {}),
    ...(fb.messagingSenderId ? { messagingSenderId: fb.messagingSenderId } : {}),
  };
}

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(buildOptions());
}

const app = getFirebaseApp();
export const db: Firestore = getFirestore(app);

// ---- Firestore emulator wiring (Web SDK path) ----
if (useEmu) {
  // Default to iOS simulator / web loopback.
  const defaultHost = "127.0.0.1";
  const defaultPort = 8081; // this app uses 8081 for Firestore in dev

  // Allow overrides from expo.extra
  let host = (extra.emulatorHost || defaultHost).trim();
  if (host === "localhost") host = defaultHost; // normalize for iOS sim

  const port =
    typeof extra.firestoreEmulatorPort === "number" && extra.firestoreEmulatorPort > 0
      ? extra.firestoreEmulatorPort
      : defaultPort;

  try {
    connectFirestoreEmulator(db, host, port);
  } catch {
    // ignore if already connected
  }
}

export default db;
