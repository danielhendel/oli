/**
 * Safe consumer error mapping for account deletion API failures.
 */

import type { ApiFailure } from "@/lib/api/http";

export type MappedDeleteError = {
  message: string;
  retryable: boolean;
  kind:
    | "network"
    | "already_requested"
    | "service_unavailable"
    | "session_expired"
    | "reauth_required"
    | "deletion_pending"
    | "unknown";
};

function readErrorCode(failure: ApiFailure): string | null {
  const json = failure.json;
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const error = (json as { error?: unknown }).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function mapDeleteApiFailure(failure: ApiFailure): MappedDeleteError {
  if (failure.kind === "network") {
    return {
      message: "No connection. Check your network and try again.",
      retryable: true,
      kind: "network",
    };
  }

  const code = readErrorCode(failure);

  if (code === "REAUTH_REQUIRED") {
    return {
      message: "Confirm your password again to continue deleting your account.",
      retryable: true,
      kind: "reauth_required",
    };
  }

  if (code === "ACCOUNT_DELETION_PENDING") {
    return {
      message: "Account deletion is already in progress.",
      retryable: false,
      kind: "deletion_pending",
    };
  }

  if (failure.status === 401 || failure.status === 403) {
    return {
      message: "Your session expired. Sign in again and retry.",
      retryable: false,
      kind: "session_expired",
    };
  }

  if (failure.status === 503) {
    return {
      message: "Account deletion could not be started. Try again.",
      retryable: true,
      kind: "service_unavailable",
    };
  }

  if (failure.status === 409) {
    return {
      message: "Account deletion was already requested.",
      retryable: false,
      kind: "already_requested",
    };
  }

  return {
    message: "Something went wrong. Please try again.",
    retryable: true,
    kind: "unknown",
  };
}

export function mapLocalCleanupFailure(): MappedDeleteError {
  return {
    message:
      "Your deletion request was accepted, but local cleanup did not finish. Tap Retry to continue.",
    retryable: true,
    kind: "unknown",
  };
}
