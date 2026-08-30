/**
 * Account deletion status normalization (API + client shared logic).
 */

import {
  DELETE_PENDING_MAX_AGE_MS,
  DELETE_PENDING_STARTED_MAX_AGE_MS,
  type ConsumerDeleteStatus,
  type DeleteBackendStatus,
} from "@oli/contracts";
import {
  firestoreTimestampToIso,
  pendingAgeAnchorMs,
} from "../export/normalizeExportStatus";

export type DeleteStatusInput = {
  backendStatus: DeleteBackendStatus;
  requestedAt: string | null;
  completedAt: string | null;
  updatedAt?: string | null;
  startedAt?: string | null;
  now?: Date;
};

export type NormalizedDeleteStatus = {
  status: ConsumerDeleteStatus;
  retryable: boolean;
  failureCategory:
    | "none"
    | "processing_failed"
    | "stale_pending"
    | "local_cleanup_failed"
    | "unknown";
};

const PENDING_STATUSES: ReadonlySet<DeleteBackendStatus> = new Set(["queued", "in_progress"]);

function deleteStatus(value: ConsumerDeleteStatus): ConsumerDeleteStatus {
  return value;
}

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isDeletePendingStale(input: {
  requestedAt: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
  now?: Date;
  maxAgeMs?: number;
  startedMaxAgeMs?: number;
}): boolean {
  const now = input.now ?? new Date();
  const started = parseIso(input.startedAt ?? null);
  if (started) {
    const startedMax = input.startedMaxAgeMs ?? DELETE_PENDING_STARTED_MAX_AGE_MS;
    return now.getTime() - started.getTime() > startedMax;
  }
  const maxAgeMs = input.maxAgeMs ?? DELETE_PENDING_MAX_AGE_MS;
  const anchorMs = pendingAgeAnchorMs(input);
  if (anchorMs == null) return true;
  return now.getTime() - anchorMs > maxAgeMs;
}

export function normalizeDeleteStatus(input: DeleteStatusInput): NormalizedDeleteStatus {
  const { backendStatus } = input;

  if (backendStatus === "completed") {
    return {
      status: deleteStatus("accepted"),
      retryable: false,
      failureCategory: "none",
    };
  }

  if (backendStatus === "failed") {
    return {
      status: deleteStatus("failed"),
      retryable: true,
      failureCategory: "processing_failed",
    };
  }

  if (PENDING_STATUSES.has(backendStatus)) {
    const staleArgs: {
      requestedAt: string | null;
      startedAt?: string | null;
      updatedAt?: string | null;
      now?: Date;
    } = { requestedAt: input.requestedAt };
    if (input.startedAt !== undefined) staleArgs.startedAt = input.startedAt;
    if (input.updatedAt !== undefined) staleArgs.updatedAt = input.updatedAt;
    if (input.now !== undefined) staleArgs.now = input.now;

    if (isDeletePendingStale(staleArgs)) {
      return {
        status: deleteStatus("failed"),
        retryable: true,
        failureCategory: "stale_pending",
      };
    }

    return {
      status: backendStatus === "queued" ? deleteStatus("queued") : deleteStatus("processing"),
      retryable: false,
      failureCategory: "none",
    };
  }

  return {
    status: deleteStatus("failed"),
    retryable: true,
    failureCategory: "unknown",
  };
}

export function coerceDeleteBackendStatus(raw: unknown): DeleteBackendStatus {
  if (typeof raw !== "string") return "failed";
  if (raw === "queued" || raw === "in_progress" || raw === "completed" || raw === "failed") {
    return raw;
  }
  return "failed";
}

export { firestoreTimestampToIso };
