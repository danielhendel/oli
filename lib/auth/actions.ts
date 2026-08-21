// lib/auth/actions.ts
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseConfig";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; title: string; message: string };

export type PasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      kind: "invalid_email" | "network" | "too_many_requests" | "unavailable" | "unknown";
      title: string;
      message: string;
    };

const BASIC_EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readFirebaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  const code = (error as { code: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * Request a Firebase password-reset email.
 * Enumeration-safe: valid emails that do not match an account still resolve as success.
 * Never logs the email or raw Firebase payloads.
 */
export const requestPasswordReset = async (emailInput: string): Promise<PasswordResetResult> => {
  const email = emailInput.trim();
  if (!BASIC_EMAIL_SHAPE.test(email)) {
    return {
      ok: false,
      kind: "invalid_email",
      title: "Check your email",
      message: "Enter a valid email address to continue.",
    };
  }

  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (error: unknown) {
    const code = readFirebaseErrorCode(error);

    // Do not reveal whether an account exists.
    if (
      code === "auth/user-not-found" ||
      code === "auth/invalid-email" ||
      code === "auth/missing-email"
    ) {
      // invalid-email from Firebase after our client check is still treated as success-safe
      // only for user-not-found/enumeration; map true invalid-email to validation.
      if (code === "auth/invalid-email" || code === "auth/missing-email") {
        return {
          ok: false,
          kind: "invalid_email",
          title: "Check your email",
          message: "Enter a valid email address to continue.",
        };
      }
      return { ok: true };
    }

    if (code === "auth/network-request-failed") {
      return {
        ok: false,
        kind: "network",
        title: "Connection problem",
        message: "Check your connection and try again.",
      };
    }

    if (code === "auth/too-many-requests") {
      return {
        ok: false,
        kind: "too_many_requests",
        title: "Please wait",
        message: "Too many attempts. Try again later.",
      };
    }

    if (
      code === "auth/operation-not-allowed" ||
      code === "auth/unauthorized-continue-uri" ||
      code === "auth/invalid-continue-uri" ||
      code === "auth/missing-continue-uri"
    ) {
      return {
        ok: false,
        kind: "unavailable",
        title: "Reset unavailable",
        message: "Password reset is temporarily unavailable. Try again later or contact support.",
      };
    }

    return {
      ok: false,
      kind: "unknown",
      title: "Something went wrong",
      message: "We could not send reset instructions. Please try again.",
    };
  }
};

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
