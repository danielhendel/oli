// lib/firebase/emulators.ts
import { Platform } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import Constants from "expo-constants";

let wired = false;

type Extra = {
  /** Optional toggle set via app.config.ts → extra.useFirebaseEmulators */
  useFirebaseEmulators?: boolean;
};

/**
 * Call once at app startup (e.g., from app/_layout.tsx).
 * Uses emulators when APP_ENV=dev or extra.useFirebaseEmulators=true.
 * iOS simulator → 127.0.0.1, Android emulator → 10.0.2.2.
 * Defaults: Auth 9099, Firestore 8081 (override with env ports).
 */
export function initEmulatorsIfNeeded() {
  if (wired) return;

  const appEnv = process.env.APP_ENV ?? "dev";
  const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;
  const useEmulators = extra.useFirebaseEmulators === true || appEnv === "dev";
  if (!useEmulators) return;

  const host = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const authPort = Number(process.env.FIREBASE_AUTH_EMULATOR_PORT ?? 9099);
  const fsPort = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8081);

  try {
    auth().useEmulator(`http://${host}:${authPort}`);
  } catch (err) {
    if (err) {
      // RNFirebase throws if already connected; safe to ignore.
    }
  }

  try {
    firestore().useEmulator(host, fsPort);
  } catch (err) {
    if (err) {
      // RNFirebase throws if already connected; safe to ignore.
    }
  }

  wired = true;
}
