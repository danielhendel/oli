/**
 * Account export status normalization (API + client shared logic).
 */

import {
  EXPORT_PACKAGE_RETENTION_DAYS,
  EXPORT_PENDING_MAX_AGE_MS,
  type ConsumerExportStatus,
  type ExportBackendStatus,
} from "@oli/contracts";

export type ExportStatusInput = {
  backendStatus: ExportBackendStatus;
  packageAvailable: boolean;
  requestedAt: string | null;
  completedAt: string | null;
  /** Prefer updatedAt/startedAt when present for age checks. */
  updatedAt?: string | null;
  startedAt?: string | null;
  now?: Date;
};

export type NormalizedExportStatus = {
  status: ConsumerExportStatus;
  expiresAt: string | null;
  retryable: boolean;
  failureCategory:
    | "none"
    | "processing_failed"
    | "artifact_unavailable"
    | "expired"
    | "stale_pending"
    | "unknown";
};

const PENDING_STATUSES: ReadonlySet<ExportBackendStatus> = new Set([
  "queued",
  "in_progress",
  "running",
]);

const READY_STATUSES: ReadonlySet<ExportBackendStatus> = new Set(["completed", "succeeded"]);

function exportStatus(value: ConsumerExportStatus): ConsumerExportStatus {
  return value;
}

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function retentionExpiresAt(completedAt: string | null): string | null {
  const completed = parseIso(completedAt);
  if (!completed) return null;
  const expires = new Date(completed.getTime() + EXPORT_PACKAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return expires.toISOString();
}

function isExpired(completedAt: string | null, now: Date): boolean {
  const expiresAt = retentionExpiresAt(completedAt);
  if (!expiresAt) return false;
  return now.getTime() > new Date(expiresAt).getTime();
}

/** Anchor for pending age: requestedAt, else startedAt, else updatedAt. */
export function pendingAgeAnchorMs(input: {
  requestedAt: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
}): number | null {
  const anchor =
    parseIso(input.requestedAt) ?? parseIso(input.startedAt ?? null) ?? parseIso(input.updatedAt ?? null);
  return anchor ? anchor.getTime() : null;
}

export function isPendingStale(input: {
  requestedAt: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
  now?: Date;
  maxAgeMs?: number;
}): boolean {
  const now = input.now ?? new Date();
  const maxAgeMs = input.maxAgeMs ?? EXPORT_PENDING_MAX_AGE_MS;
  const anchorMs = pendingAgeAnchorMs(input);
  // Malformed / missing timestamps on a pending job cannot be trusted as active.
  if (anchorMs == null) return true;
  return now.getTime() - anchorMs > maxAgeMs;
}

export function normalizeExportStatus(input: ExportStatusInput): NormalizedExportStatus {
  const now = input.now ?? new Date();
  const { backendStatus, packageAvailable, completedAt } = input;

  if (READY_STATUSES.has(backendStatus) && packageAvailable) {
    if (isExpired(completedAt, now)) {
      return {
        status: exportStatus("expired"),
        expiresAt: retentionExpiresAt(completedAt),
        retryable: true,
        failureCategory: "expired",
      };
    }
    return {
      status: exportStatus("ready"),
      expiresAt: retentionExpiresAt(completedAt),
      retryable: false,
      failureCategory: "none",
    };
  }

  if (backendStatus === "failed") {
    return {
      status: exportStatus("failed"),
      expiresAt: null,
      retryable: true,
      failureCategory: "processing_failed",
    };
  }

  if (PENDING_STATUSES.has(backendStatus)) {
    const staleArgs: {
      requestedAt: string | null;
      now: Date;
      startedAt?: string | null;
      updatedAt?: string | null;
    } = {
      requestedAt: input.requestedAt,
      now,
    };
    if (input.startedAt !== undefined) staleArgs.startedAt = input.startedAt;
    if (input.updatedAt !== undefined) staleArgs.updatedAt = input.updatedAt;
    if (isPendingStale(staleArgs)) {
      return {
        status: exportStatus("failed"),
        expiresAt: null,
        retryable: true,
        failureCategory: "stale_pending",
      };
    }
    return {
      status: exportStatus("pending"),
      expiresAt: null,
      retryable: false,
      failureCategory: "none",
    };
  }

  if (READY_STATUSES.has(backendStatus) && !packageAvailable) {
    return {
      status: exportStatus("failed"),
      expiresAt: null,
      retryable: true,
      failureCategory: "artifact_unavailable",
    };
  }

  return {
    status: exportStatus("failed"),
    expiresAt: null,
    retryable: true,
    failureCategory: "unknown",
  };
}

export function globalExportDocId(uid: string, requestId: string): string {
  return `${uid}_${requestId}`.replace(/\//g, "_");
}

export function coerceBackendStatus(raw: unknown): ExportBackendStatus {
  if (typeof raw !== "string") return "failed";
  const s = raw as ExportBackendStatus;
  if (
    s === "queued" ||
    s === "in_progress" ||
    s === "running" ||
    s === "completed" ||
    s === "succeeded" ||
    s === "failed"
  ) {
    return s;
  }
  return "failed";
}

export function firestoreTimestampToIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      try {
        return toDate.call(value).toISOString();
      } catch {
        return null;
      }
    }
  }
  return null;
}
