/**
 * Maps Firebase Auth error codes to consumer-safe copy.
 * Never returns raw SDK strings, codes, or payloads.
 */

export type MappedAuthFailure = {
  title: string;
  message: string;
  kind:
    | "invalid_email"
    | "invalid_credentials"
    | "network"
    | "too_many_requests"
    | "disabled"
    | "unavailable"
    | "unknown";
};

const CREDENTIAL_CODES = new Set([
  "auth/invalid-credential",
  "auth/invalid-login-credentials",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/invalid-password",
]);

const UNAVAILABLE_CODES = new Set([
  "auth/operation-not-allowed",
  "auth/unauthorized-continue-uri",
  "auth/invalid-continue-uri",
  "auth/missing-continue-uri",
  "auth/admin-restricted-operation",
]);

export function readFirebaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  const code = (error as { code: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function mapSignInAuthError(error: unknown): MappedAuthFailure {
  const code = readFirebaseErrorCode(error);

  if (code === "auth/invalid-email" || code === "auth/missing-email") {
    return {
      kind: "invalid_email",
      title: "Check your email",
      message: "Enter a valid email address to continue.",
    };
  }

  if (code && CREDENTIAL_CODES.has(code)) {
    return {
      kind: "invalid_credentials",
      title: "Sign in failed",
      message: "The email or password is incorrect.",
    };
  }

  if (code === "auth/network-request-failed") {
    return {
      kind: "network",
      title: "Connection problem",
      message: "Check your connection and try again.",
    };
  }

  if (code === "auth/too-many-requests") {
    return {
      kind: "too_many_requests",
      title: "Please wait",
      message: "Too many attempts. Try again later.",
    };
  }

  if (code === "auth/user-disabled") {
    return {
      kind: "disabled",
      title: "Sign in unavailable",
      message: "This account is disabled. Contact support for help.",
    };
  }

  if (code && UNAVAILABLE_CODES.has(code)) {
    return {
      kind: "unavailable",
      title: "Sign in unavailable",
      message: "Sign in is temporarily unavailable. Please try again later.",
    };
  }

  return {
    kind: "unknown",
    title: "Sign in failed",
    message: "We could not sign you in. Please try again.",
  };
}

export function mapSignUpAuthError(error: unknown): MappedAuthFailure {
  const code = readFirebaseErrorCode(error);

  if (code === "auth/invalid-email" || code === "auth/missing-email") {
    return {
      kind: "invalid_email",
      title: "Check your email",
      message: "Enter a valid email address to continue.",
    };
  }

  if (code === "auth/email-already-in-use") {
    // Enumeration-safe: do not confirm the address is registered.
    return {
      kind: "invalid_credentials",
      title: "Could not create account",
      message: "Check your details and try again, or sign in if you already have an account.",
    };
  }

  if (code === "auth/weak-password") {
    return {
      kind: "invalid_credentials",
      title: "Choose a stronger password",
      message: "Use at least 6 characters and try again.",
    };
  }

  if (code === "auth/network-request-failed") {
    return {
      kind: "network",
      title: "Connection problem",
      message: "Check your connection and try again.",
    };
  }

  if (code === "auth/too-many-requests") {
    return {
      kind: "too_many_requests",
      title: "Please wait",
      message: "Too many attempts. Try again later.",
    };
  }

  if (code && UNAVAILABLE_CODES.has(code)) {
    return {
      kind: "unavailable",
      title: "Sign up unavailable",
      message: "Account creation is temporarily unavailable. Please try again later.",
    };
  }

  return {
    kind: "unknown",
    title: "Sign up failed",
    message: "We could not create your account. Please try again.",
  };
}

export const BASIC_EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthEmail(emailInput: string): string {
  return emailInput.trim();
}
