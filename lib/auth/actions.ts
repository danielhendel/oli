// lib/auth/actions.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    type AuthError,
  } from "firebase/auth";
  import { getFirebaseAuth } from "@/lib/firebaseConfig";
  
  export type AuthResult =
    | { ok: true }
    | { ok: false; title: string; message: string };
  
  type NormalizedAuthError = {
    title: string;
    message: string;
  };
  
  const isFirebaseAuthError = (e: unknown): e is AuthError => {
    return typeof e === "object" && e !== null && "code" in e && typeof (e as AuthError).code === "string";
  };
  
  const normalizeAuthError = (e: unknown): NormalizedAuthError => {
    const fallback: NormalizedAuthError = {
      title: "Authentication error",
      message: "Please try again.",
    };
  
    if (!isFirebaseAuthError(e)) return fallback;
  
    switch (e.code) {
      case "auth/invalid-email":
        return { title: "Invalid email", message: "Please enter a valid email address." };
  
      case "auth/missing-password":
        return { title: "Missing password", message: "Please enter your password." };
  
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return {
          title: "Incorrect email or password",
          message: "Please check your credentials and try again.",
        };
  
      case "auth/user-not-found":
        return {
          title: "Account not found",
          message: "No account exists for that email.",
        };
  
      case "auth/email-already-in-use":
        return {
          title: "Email already in use",
          message: "Try signing in instead, or use a different email.",
        };
  
      case "auth/weak-password":
        return {
          title: "Weak password",
          message: "Please choose a stronger password (at least 6 characters).",
        };
  
      case "auth/network-request-failed":
        return {
          title: "Network error",
          message: "Check your internet connection and try again.",
        };
  
      default:
        return {
          title: "Authentication failed",
          message: e.message || fallback.message,
        };
    }
  };
  
  /**
   * Email/password sign-in
   * Used by app/(auth)/sign-in.tsx
   */
  export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true };
    } catch (e) {
      const { title, message } = normalizeAuthError(e);
      return { ok: false, title, message };
    }
  };
  
  /**
   * Email/password sign-up
   * Used by app/(auth)/sign-up.tsx
   */
  export const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true };
    } catch (e) {
      const { title, message } = normalizeAuthError(e);
      return { ok: false, title, message };
    }
  };
  
  /**
   * Sign out
   * Used by debug + settings
   */
  export const signOutUser = async (): Promise<void> => {
    await firebaseSignOut(getFirebaseAuth());
  };
  
  // Alias kept for clarity / consistency
  export const authSignOut = signOutUser;
  