// lib/auth/actions.ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseConfig";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; title: string; message: string };

export const signInWithEmail = async (email: string, password: string): Promise<AuthActionResult> => {
  try {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, title: "Sign in failed", message: msg };
  }
};

export const signUpWithEmail = async (email: string, password: string): Promise<AuthActionResult> => {
  try {
    const auth = getFirebaseAuth();
    await createUserWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, title: "Sign up failed", message: msg };
  }
};

export const signOutUser = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  await signOut(auth);
};
