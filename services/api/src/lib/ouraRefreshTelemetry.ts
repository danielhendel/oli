/**
 * Privacy-safe telemetry for the Oura refresh path (pull-now, backfill, provider fetch,
 * vendor snapshot writes, post-raw enqueue/persist).
 *
 * Design goal: every call site in the active Oura refresh path logs through
 * `logOuraRefreshTelemetry` with a closed set of typed, aggregate-only fields.
 * No uid, dates/day strings, document/snapshot ids, scores, tokens, or raw error
 * messages are ever accepted by this module's event types.
 */

import { randomUUID } from "crypto";

import { logger } from "./logger";

/**
 * Strict opaque request-trace ID for Oura telemetry (Option B).
 * Accepts only lowercase/uppercase RFC UUID form (36 chars). Anything else —
 * including arbitrary `x-request-id`, emails, dates, URLs, tokens, idempotency
 * keys, UIDs, or oversized strings — is discarded and replaced with a new
 * server-generated UUID. Never hashes, truncates, or encodes unsafe input.
 */
const OURA_TELEMETRY_REQUEST_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OURA_TELEMETRY_REQUEST_ID_MAX_LEN = 36;

export function sanitizeOuraTelemetryRequestId(candidate: unknown): string {
  if (typeof candidate !== "string") return randomUUID();
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > OURA_TELEMETRY_REQUEST_ID_MAX_LEN) {
    return randomUUID();
  }
  if (!OURA_TELEMETRY_REQUEST_ID_UUID.test(trimmed)) {
    return randomUUID();
  }
  return trimmed;
}

/** Closed set of privacy-safe error codes for the Oura refresh path. */
export type OuraSafeErrorCode =
  | "NO_CONNECTION"
  | "TOKEN_UNAVAILABLE"
  | "PROVIDER_UNAUTHORIZED"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_NETWORK"
  | "PROVIDER_SCHEMA_INVALID"
  | "RAW_EVENT_PERSIST_FAILED"
  | "POST_RAW_PUBLISH_FAILED"
  | "POST_RAW_PERSIST_FAILED"
  | "FUNCTION_PAYLOAD_INVALID"
  | "FUNCTION_PERSIST_FAILED"
  | "UNKNOWN";

const OURA_SAFE_ERROR_CODES: ReadonlySet<string> = new Set([
  "NO_CONNECTION",
  "TOKEN_UNAVAILABLE",
  "PROVIDER_UNAUTHORIZED",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_NETWORK",
  "PROVIDER_SCHEMA_INVALID",
  "RAW_EVENT_PERSIST_FAILED",
  "POST_RAW_PUBLISH_FAILED",
  "POST_RAW_PERSIST_FAILED",
  "FUNCTION_PAYLOAD_INVALID",
  "FUNCTION_PERSIST_FAILED",
  "UNKNOWN",
]);

/** Error codes that are safe to retry (rate limit / timeout / transient network / best-effort persistence). */
const RETRYABLE_SAFE_ERROR_CODES: ReadonlySet<OuraSafeErrorCode> = new Set([
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_NETWORK",
  "RAW_EVENT_PERSIST_FAILED",
  "POST_RAW_PUBLISH_FAILED",
  "POST_RAW_PERSIST_FAILED",
  "FUNCTION_PERSIST_FAILED",
]);

function isOuraSafeErrorCode(v: unknown): v is OuraSafeErrorCode {
  return typeof v === "string" && OURA_SAFE_ERROR_CODES.has(v);
}

/**
 * Structural (duck-typed) check for `OuraApiError`-shaped errors. Intentionally avoids
 * importing the class from `./ouraApi` to keep this module dependency-free (ouraApi.ts
 * imports telemetry helpers from here; importing back would create a cycle).
 */
function isOuraApiErrorLike(err: unknown): err is { code: string; status?: number; message?: string } {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}

function isNetworkLikeError(err: Error): boolean {
  const text = `${err.name} ${err.message}`.toLowerCase();
  return (
    text.includes("network") ||
    text.includes("econnreset") ||
    text.includes("econnrefused") ||
    text.includes("enotfound") ||
    text.includes("eai_again") ||
    text.includes("fetch failed")
  );
}

function isTimeoutLikeError(err: Error): boolean {
  const text = `${err.name} ${err.message}`.toLowerCase();
  return text.includes("timeout") || text.includes("etimedout");
}

/**
 * Categorize any thrown value into a closed, privacy-safe error code + retryable flag.
 * Never returns (or otherwise leaks) `Error.message` — the message is only inspected
 * internally to pick a category, never echoed back to the caller.
 *
 * `hint` is an optional fallback `OuraSafeErrorCode` to use when the error itself can't
 * be classified more specifically (e.g. a caller already knows the failure is a
 * NO_CONNECTION / TOKEN_UNAVAILABLE situation before an exception is even involved).
 */
export function categorizeOuraSafeError(
  err: unknown,
  hint?: string,
): { safeErrorCode: OuraSafeErrorCode; retryable: boolean } {
  const fallback: OuraSafeErrorCode = isOuraSafeErrorCode(hint) ? hint : "UNKNOWN";

  const finalize = (code: OuraSafeErrorCode): { safeErrorCode: OuraSafeErrorCode; retryable: boolean } => ({
    safeErrorCode: code,
    retryable: RETRYABLE_SAFE_ERROR_CODES.has(code),
  });

  if (isOuraApiErrorLike(err)) {
    const status = typeof err.status === "number" ? err.status : undefined;
    if (status === 401 || err.code === "OURA_UNAUTHORIZED" || err.code === "OURA_TOKEN_REFRESH_FAILED") {
      return finalize("PROVIDER_UNAUTHORIZED");
    }
    if (status === 429) return finalize("PROVIDER_RATE_LIMITED");
    if (status === 408) return finalize("PROVIDER_TIMEOUT");
    if (typeof status === "number" && status >= 500) return finalize("PROVIDER_NETWORK");
    if (err.code === "OURA_TOKEN_INVALID") return finalize("PROVIDER_SCHEMA_INVALID");
    return finalize(fallback);
  }

  if (err instanceof Error) {
    if (isTimeoutLikeError(err)) return finalize("PROVIDER_TIMEOUT");
    if (isNetworkLikeError(err)) return finalize("PROVIDER_NETWORK");
  }

  return finalize(fallback);
}

/** Common fields every Oura refresh telemetry event may carry. */
type OuraRefreshTelemetryBase = {
  requestId?: string;
  durationMs?: number;
};

export type OuraRefreshTelemetryEvent =
  | (OuraRefreshTelemetryBase & {
      operation: "oura_reconnect_cleanup_failed";
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_pull_failed";
      safeErrorCode: OuraSafeErrorCode;
      retryable: boolean;
      cleanedUp?: boolean;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_busy";
      retryable: true;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_in_flight_join";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_lock_wait";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_lock_unavailable";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_lock_stolen";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_lock_acquired";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_concurrent_success_detected";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_invalid_grant_cleanup";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_token_refresh_lock_released";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_raw_events_core_write_done";
      rawEventCreatedCount: number;
      rawEventExistingCount: number;
      sleepDocumentCount: number;
      hrvDocumentCount: number;
      stepsDocumentCount: number;
      workoutDocumentCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_raw_events_vendor_detail_deferred";
      rawItemCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_raw_events_vendor_detail_deferred_failed";
      rawItemCount: number;
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_raw_event_write_failed";
      domain: string;
      safeErrorCode: OuraSafeErrorCode;
      failedCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_legacy_recovery_skipped";
      backfillStatus?: string | null;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_legacy_recovery_detected";
      backfillStatus?: string | null;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_legacy_recovery_started";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_legacy_recovery_failed";
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_pull_window";
      windowDayCount: number;
      sleepStartOverlapDayCount: number;
      sleepEndOverlapDayCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_provider_fetch_skipped";
      dataset: string;
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_pull_sleep_summary";
      hasSleepDocuments: boolean;
      sleepDocumentCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_pull_fetch_completed";
      sleepDocumentCount: number;
      readinessDocumentCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_ingest_docs_dropped";
      sleepDocumentCount: number;
      rejectedItemCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_ingest_item_counts";
      sleepItemCount: number;
      hrvItemCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_raw_event_persist_started";
      sleepItemCount: number;
      hrvItemCount: number;
      stepsItemCount: number;
      workoutItemCount: number;
      rawItemCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_raw_event_persist_completed";
      rawEventCreatedCount: number;
      rawEventExistingCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_post_raw_enqueued";
      queued: true;
      sleepDocumentCount: number;
      readinessDocumentCount: number;
      dailySleepDocumentCount: number;
      dailyStressDocumentCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_post_raw_enqueue_failed";
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_post_raw_persist_started";
      sleepDocumentCount: number;
      readinessDocumentCount: number;
      dailySleepDocumentCount: number;
      dailyStressDocumentCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_post_raw_persist_completed";
      writtenCount: number;
      metadataWritten: boolean;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_post_raw_persist_failed";
      safeErrorCode: OuraSafeErrorCode;
      metadataWritten: boolean;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_backfill_skipped";
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_backfill_started";
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_backfill_chunk_completed";
      chunkIndex: number;
      chunkCount: number;
      chunkDayCount: number;
      sleepSnapshotWrittenCount: number;
      readinessSnapshotWrittenCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_backfill_chunk_failed";
      chunkIndex: number;
      chunkCount: number;
      chunkDayCount: number;
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_backfill_completed";
      sleepSnapshotWrittenCount: number;
      readinessSnapshotWrittenCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_backfill_failed";
      safeErrorCode: OuraSafeErrorCode;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_provider_fetch_page_capped";
      dataset: string;
      pageCount: number;
      providerItemCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_provider_fetch_completed";
      dataset: string;
      pageCount: number;
      providerItemCount: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_vendor_snapshot_docs_received";
      domain: string;
      sleepDocumentCount?: number;
      dailySleepDocumentCount?: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_vendor_snapshot_docs_dropped";
      domain: string;
      rejectedItemCount: number;
      sleepDocumentCount?: number;
      readinessDocumentCount?: number;
      dailyStressDocumentCount?: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_vendor_snapshot_extracted";
      domain: string;
      validatedItemCount: number;
      sleepDocumentCount?: number;
      readinessDocumentCount?: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_vendor_snapshot_write_failed";
      domain: string;
      safeErrorCode: OuraSafeErrorCode;
      failedCount?: number;
    })
  | (OuraRefreshTelemetryBase & {
      operation: "oura_vendor_snapshot_written";
      domain: string;
      writtenCount: number;
      failedCount: number;
    });

/** Operations logged at `error` level (hard failures). */
const ERROR_OPERATIONS: ReadonlySet<string> = new Set([
  "oura_reconnect_cleanup_failed",
  "oura_pull_failed",
  "oura_legacy_recovery_failed",
  "oura_post_raw_enqueue_failed",
  "oura_post_raw_persist_failed",
  "oura_backfill_failed",
  "oura_vendor_snapshot_write_failed",
  "oura_raw_events_vendor_detail_deferred_failed",
  "oura_raw_event_write_failed",
]);

/** Operations logged at `warn` level (degraded but non-fatal). */
const WARN_OPERATIONS: ReadonlySet<string> = new Set([
  "oura_token_refresh_busy",
  "oura_provider_fetch_skipped",
  "oura_backfill_chunk_failed",
  "oura_provider_fetch_page_capped",
  "oura_token_refresh_lock_unavailable",
]);

/**
 * Log a single Oura refresh telemetry event. Only the event's own typed fields are
 * emitted (plus `msg`/`operation`, which are the same value) — no free-form fields,
 * no error messages, no identifiers. `requestId` is always sanitized before emit.
 */
export function logOuraRefreshTelemetry(event: OuraRefreshTelemetryEvent): void {
  const { operation, requestId, ...rest } = event;
  const payload: Record<string, unknown> = { msg: operation, operation, ...rest };
  if (requestId !== undefined) {
    payload.requestId = sanitizeOuraTelemetryRequestId(requestId);
  }

  if (ERROR_OPERATIONS.has(operation)) {
    logger.error(payload);
  } else if (WARN_OPERATIONS.has(operation)) {
    logger.warn(payload);
  } else {
    logger.info(payload);
  }
}
