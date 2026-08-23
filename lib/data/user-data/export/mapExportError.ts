/**
 * Safe export error mapping for consumer UI (Stage 1B).
 */

import type { ApiFailure } from "@/lib/api/http";

export type ExportUserError = {
  message: string;
  retryable: boolean;
  category:
    | "network"
    | "unauthorized"
    | "pending"
    | "rate_limited"
    | "service_unavailable"
    | "export_failed"
    | "export_expired"
    | "artifact_unavailable"
    | "download_failed"
    | "storage"
    | "unknown";
};

function apiErrorCode(failure: ApiFailure): string | null {
  if (!failure.json || typeof failure.json !== "object" || Array.isArray(failure.json)) {
    return null;
  }
  const err = (failure.json as { error?: { code?: unknown } }).error;
  return typeof err?.code === "string" ? err.code : null;
}

export function mapExportApiFailure(failure: ApiFailure): ExportUserError {
  if (failure.kind === "network" || failure.status === 0) {
    return {
      message: "No connection. Check your network and try again.",
      retryable: true,
      category: "network",
    };
  }

  if (failure.status === 401 || failure.status === 403) {
    return {
      message: "Your session expired. Sign in again and retry.",
      retryable: false,
      category: "unauthorized",
    };
  }

  if (failure.status === 409) {
    return {
      message: "Your export is still being prepared.",
      retryable: false,
      category: "pending",
    };
  }

  if (failure.status === 410) {
    return {
      message: "This export has expired. Request a new export.",
      retryable: true,
      category: "export_expired",
    };
  }

  if (failure.status === 404) {
    const code = apiErrorCode(failure);
    if (code === "ARTIFACT_UNAVAILABLE") {
      return {
        message: "The export file is not available right now.",
        retryable: true,
        category: "artifact_unavailable",
      };
    }
    return {
      message: "Export request not found.",
      retryable: false,
      category: "unknown",
    };
  }

  if (failure.status === 429) {
    return {
      message: "Too many requests. Wait a moment and try again.",
      retryable: true,
      category: "rate_limited",
    };
  }

  if (failure.status >= 500) {
    return {
      message: "Export service is temporarily unavailable.",
      retryable: true,
      category: "service_unavailable",
    };
  }

  return {
    message: "Something went wrong. Try again or contact support.",
    retryable: true,
    category: "unknown",
  };
}

export function mapExportDownloadError(message: string): ExportUserError {
  if (/expired/i.test(message)) {
    return {
      message: "This download link expired. Open Your Data and try again.",
      retryable: true,
      category: "export_expired",
    };
  }
  if (/storage|space|disk/i.test(message)) {
    return {
      message: "Not enough storage on this device to save the export.",
      retryable: false,
      category: "storage",
    };
  }
  return {
    message: "Could not download the export. Try again.",
    retryable: true,
    category: "download_failed",
  };
}
