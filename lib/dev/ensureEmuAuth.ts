// lib/dev/ensureEmuAuth.ts
import Constants from "expo-constants";
import { signInAnonymously } from "firebase/auth";
import { getAuthInstance } from "../firebaseConfig";

/**
 * Ensures we're signed into the Auth emulator (anonymous).
 * Returns the emulator UID if available, else "".
 */
export async function ensureEmulatorAuth(): Promise<string> {
  const extra = (Constants.expoConfig?.extra ?? {}) as { useEmulators?: boolean };
  if (!extra.useEmulators) return "";

  const auth = getAuthInstance();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser?.uid ?? "";
}
