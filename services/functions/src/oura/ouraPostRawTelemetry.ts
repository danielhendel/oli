/**
 * Privacy-safe telemetry for the Oura post-raw Function path
 * (onOuraPostRawRequested → runOuraPostRaw).
 *
 * Closed typed events only — no uid, day, document/snapshot ids, health values,
 * raw error messages, Pub/Sub payloads, or tokens.
 */

import { logger } from "firebase-functions";

/** Closed set of privacy-safe error codes for the post-raw Function path. */
export type OuraPostRawSafeErrorCode =
  | "FUNCTION_PAYLOAD_INVALID"
  | "FUNCTION_PERSIST_FAILED"
  | "UNKNOWN";

const RETRYABLE: ReadonlySet<OuraPostRawSafeErrorCode> = new Set(["FUNCTION_PERSIST_FAILED"]);

export function categorizeOuraPostRawSafeError(
  err: unknown,
  hint?: OuraPostRawSafeErrorCode,
): { safeErrorCode: OuraPostRawSafeErrorCode; retryable: boolean } {
  const code: OuraPostRawSafeErrorCode = hint ?? "UNKNOWN";
  if (err instanceof Error) {
    const text = `${err.name} ${err.message}`.toLowerCase();
    if (
      text.includes("timeout") ||
      text.includes("deadline") ||
      text.includes("unavailable") ||
      text.includes("aborted") ||
      text.includes("resource exhausted")
    ) {
      return { safeErrorCode: "FUNCTION_PERSIST_FAILED", retryable: true };
    }
  }
  return { safeErrorCode: code, retryable: RETRYABLE.has(code) };
}

type OuraPostRawTelemetryBase = {
  requestId?: string;
  durationMs?: number;
};

export type OuraPostRawTelemetryEvent =
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_started";
      sleepDocumentCount: number;
      readinessDocumentCount: number;
      dailySleepDocumentCount: number;
      dailyStressDocumentCount: number;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_completed";
      writtenCount: number;
      sleepDocumentCount: number;
      readinessDocumentCount: number;
      dailyStressDocumentCount: number;
      sleepNightDocumentCount: number;
      metadataWritten: boolean;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_rejected";
      safeErrorCode: OuraPostRawSafeErrorCode;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_failed";
      safeErrorCode: OuraPostRawSafeErrorCode;
      retryable: boolean;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_domain_docs_received";
      domain: string;
      sleepDocumentCount?: number;
      dailySleepDocumentCount?: number;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_domain_docs_dropped";
      domain: string;
      rejectedItemCount: number;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_domain_extracted";
      domain: string;
      validatedItemCount: number;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_domain_written";
      domain: string;
      writtenCount: number;
      failedCount: number;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_domain_write_failed";
      domain: string;
      safeErrorCode: OuraPostRawSafeErrorCode;
      failedCount: number;
      retryable: boolean;
    })
  | (OuraPostRawTelemetryBase & {
      operation: "oura_post_raw_metadata_failed";
      safeErrorCode: OuraPostRawSafeErrorCode;
      writtenCount: number;
    });

const ERROR_OPERATIONS: ReadonlySet<string> = new Set([
  "oura_post_raw_failed",
  "oura_post_raw_rejected",
  "oura_post_raw_domain_write_failed",
  "oura_post_raw_metadata_failed",
]);

const WARN_OPERATIONS: ReadonlySet<string> = new Set([]);

/**
 * Log a single post-raw telemetry event. Only typed fields are emitted —
 * no free-form metadata, error messages, or identifiers.
 */
export function logOuraPostRawTelemetry(event: OuraPostRawTelemetryEvent): void {
  const { operation, ...rest } = event;
  const payload: Record<string, unknown> = { msg: operation, operation, ...rest };

  if (ERROR_OPERATIONS.has(operation)) {
    logger.error(payload);
  } else if (WARN_OPERATIONS.has(operation)) {
    logger.warn(payload);
  } else {
    logger.info(payload);
  }
}
