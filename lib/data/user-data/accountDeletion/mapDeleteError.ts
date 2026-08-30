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
    | "unknown";
};

export function mapDeleteApiFailure(failure: ApiFailure): MappedDeleteError {
  if (failure.kind === "network") {
    return {
      message: "No connection. Check your network and try again.",
      retryable: true,
      kind: "network",
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
