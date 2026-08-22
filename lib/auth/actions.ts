// lib/auth/actions.ts
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseConfig";
import {
  BASIC_EMAIL_SHAPE,
  mapSignInAuthError,
  mapSignUpAuthError,
  normalizeAuthEmail,
  readFirebaseErrorCode,
} from "@/lib/auth/mapAuthError";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; title: string; message: string; kind?: string };

export type PasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      kind: "invalid_email" | "network" | "too_many_requests" | "unavailable" | "unknown";
      title: string;
      message: string;
    };

/**
 * Request a Firebase password-reset email.
 * Enumeration-safe: valid emails that do not match an account still resolve as success.
 * Never logs the email or raw Firebase payloads.
 */
export const requestPasswordReset = async (emailInput: string): Promise<PasswordResetResult> => {
  const email = normalizeAuthEmail(emailInput);
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

export const signInWithEmail = async (
  emailInput: string,
  password: string,
): Promise<AuthActionResult> => {
  const email = normalizeAuthEmail(emailInput);
  if (!BASIC_EMAIL_SHAPE.test(email)) {
    return {
      ok: false,
      kind: "invalid_email",
      title: "Check your email",
      message: "Enter a valid email address to continue.",
    };
  }
  if (password.length === 0) {
    return {
      ok: false,
      kind: "invalid_credentials",
      title: "Sign in failed",
      message: "The email or password is incorrect.",
    };
  }

  try {
    const auth = getFirebaseAuth();
    // Password is passed exactly as entered — never trimmed or mutated.
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (error: unknown) {
    const mapped = mapSignInAuthError(error);
    return {
      ok: false,
      kind: mapped.kind,
      title: mapped.title,
      message: mapped.message,
    };
  }
};

export const signUpWithEmail = async (
  emailInput: string,
  password: string,
): Promise<AuthActionResult> => {
  const email = normalizeAuthEmail(emailInput);
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
    await createUserWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (error: unknown) {
    const mapped = mapSignUpAuthError(error);
    return {
      ok: false,
      kind: mapped.kind,
      title: mapped.title,
      message: mapped.message,
    };
  }
};

export const signOutUser = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  await signOut(auth);
};
