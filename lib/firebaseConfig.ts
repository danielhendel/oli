// lib/firebaseConfig.ts
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  type Auth,
  type UserCredential,
  type Persistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  type Firestore,
} from "firebase/firestore";

type FirebaseExtra = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getFirebaseExtra(): FirebaseExtra {
  const extraRoot = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fb = (extraRoot["firebase"] ?? {}) as Record<string, unknown>;
  return {
    apiKey: String(fb["apiKey"] ?? ""),
    authDomain: String(fb["authDomain"] ?? ""),
    projectId: String(fb["projectId"] ?? ""),
    storageBucket: String(fb["storageBucket"] ?? ""),
    messagingSenderId: String(fb["messagingSenderId"] ?? ""),
    appId: String(fb["appId"] ?? ""),
  };
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
const useEmulators = Boolean(extra["useEmulators"]);
const configuredHost = String(extra["emulatorHost"] ?? "127.0.0.1");
const emulatorHost = Platform.OS === "android" ? "10.0.2.2" : configuredHost;

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(getFirebaseExtra());

// Try to get RN persistence from either entry point.
// If neither is present, we return undefined (memory persistence will be used).
function getRNPersistenceOrUndefined():
  | { persistence: Persistence }
  | undefined
{
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("firebase/auth") as {
      getReactNativePersistence?: (s: typeof AsyncStorage) => Persistence;
    };
    if (typeof mod.getReactNativePersistence === "function") {
      return { persistence: mod.getReactNativePersistence(AsyncStorage) };
    }
  } catch {
    // noop for environments where this path isn't available
    void 0;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require("firebase/auth/react-native") as {
      getReactNativePersistence: (s: typeof AsyncStorage) => Persistence;
    };
    return { persistence: rn.getReactNativePersistence(AsyncStorage) };
  } catch {
    // noop for environments where this path isn't available
    void 0;
  }
  return undefined;
}

function initAuth(appInstance: FirebaseApp): Auth {
  const rn = getRNPersistenceOrUndefined();
  try {
    return initializeAuth(appInstance, rn ?? {});
  } catch {
    try {
      return getAuth(appInstance);
    } catch {
      return initializeAuth(appInstance);
    }
  }
}
const auth = initAuth(app);

// Firestore with local cache
let db: Firestore;
try {
  db = getFirestore(app);
} catch {
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
}

// Connect emulators (dev)
if (useEmulators) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  } catch {
    // emulator not running / not reachable — ignore in dev
    void 0;
  }
}

// Compat helpers
export function getAuthInstance(): Auth {
  return auth;
}
export function getDb(): Firestore {
  return db;
}

export async function signInWithGoogleIdToken(idToken: string): Promise<UserCredential> {
  const cred = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, cred);
}

export async function signInWithAppleIdToken(identityToken: string): Promise<UserCredential> {
  const provider = new OAuthProvider("apple.com");
  const cred = provider.credential({ idToken: identityToken });
  return signInWithCredential(auth, cred);
}

export { app, auth, db };
