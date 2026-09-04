/**
 * Secure reauthentication for account deletion (Stage 1C).
 * Password never leaves the client or is logged.
 */

import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebaseConfig";
import { readFirebaseErrorCode } from "@/lib/auth/mapAuthError";

export type ReauthForDeletionResult =
  | { ok: true }
  | {
      ok: false;
      kind:
        | "invalid_credentials"
        | "network"
        | "too_many_requests"
        | "expired_session"
        | "unavailable"
        | "unknown";
      title: string;
      message: string;
    };

/**
 * Reauthenticate the current Firebase user with email/password.
 * Password is passed exactly as entered — never trimmed or mutated.
 */
export async function reauthenticateForAccountDeletion(
  password: string,
): Promise<ReauthForDeletionResult> {
  if (password.length === 0) {
    return {
      ok: false,
      kind: "invalid_credentials",
      title: "Check your password",
      message: "Enter your current password to continue.",
    };
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return {
      ok: false,
      kind: "expired_session",
      title: "Session expired",
      message: "Sign in again and retry account deletion.",
    };
  }

  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (!email) {
    return {
      ok: false,
      kind: "unavailable",
      title: "Deletion unavailable",
      message: "Account deletion is temporarily unavailable. Try again later.",
    };
  }

  try {
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(user, credential);
    await user.getIdToken(true);
    return { ok: true };
  } catch (error: unknown) {
    const code = readFirebaseErrorCode(error);

    if (
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/user-mismatch"
    ) {
      return {
        ok: false,
        kind: "invalid_credentials",
        title: "Password incorrect",
        message: "The password you entered is incorrect.",
      };
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

    if (code === "auth/user-token-expired" || code === "auth/requires-recent-login") {
      return {
        ok: false,
        kind: "expired_session",
        title: "Session expired",
        message: "Sign in again and retry account deletion.",
      };
    }

    return {
      ok: false,
      kind: "unknown",
      title: "Something went wrong",
      message: "We could not verify your password. Please try again.",
    };
  }
}

/**
 * Provider hook for future Apple Sign-In reauthentication.
 * Stage 1C implements email/password only.
 */
export type DeletionReauthProvider = "password";

export function supportedDeletionReauthProviders(): readonly DeletionReauthProvider[] {
  return ["password"];
}
