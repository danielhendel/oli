/**
 * DEV-only Body Scan runtime diagnostics for physical reprocess + original-report gates.
 *
 * Never carries UID, scan/document IDs, paths, filenames, URLs, query strings, or health values.
 * Emissions are no-ops outside `__DEV__`.
 */

export const BODY_SCAN_RUNTIME_DEV_EVENT_PREFIX = "[BODY_SCAN_RUNTIME_DEV]" as const;

/**
 * Short feature-token shown in DEV so physical testers can prove the loaded JS bundle.
 * Bump with each runtime-diag commit short SHA (never a user/health identifier).
 */
export const BODY_SCAN_RUNTIME_JS_TOKEN = "pdfmag01" as const;

export type BodyScanRuntimeDevOperation = "reprocess" | "original_report" | "js_identity";

export type BodyScanRuntimeDevStage =
  | "js_token"
  | "press"
  | "handler_enter"
  | "early_return"
  | "request_start"
  | "response"
  | "refetch_start"
  | "refetch_complete"
  | "grant_start"
  | "grant_success"
  | "grant_failed"
  | "policy_pass"
  | "policy_fail"
  | "fetch_start"
  | "fetch_response"
  | "bytes_validated"
  | "in_memory_pdf_magic"
  | "partial_write"
  | "after_write_pdf_magic"
  | "pdf_validation"
  | "rename_final"
  | "native_open"
  | "native_close"
  | "cleanup_complete";

export type BodyScanRuntimeDevStatusValue = "started" | "ok" | "failed";

export type BodyScanRuntimeDevHttpBucket =
  | "none"
  | "2xx"
  | "3xx"
  | "4xx"
  | "5xx"
  | "network"
  | "timeout"
  | "unknown";

export type BodyScanRuntimeDevByteBucket =
  | "zero"
  | "small"
  | "normal"
  | "oversized"
  | "unknown";

export type BodyScanRuntimeDevSafeReason =
  | "missing_auth"
  | "missing_scan_id"
  | "not_retryable"
  | "http_failed"
  | "contract_failed"
  | "network_failed"
  | "timeout"
  | "invalid_url"
  | "insecure_scheme"
  | "host_not_allowed"
  | "redirect_rejected"
  | "content_too_large"
  | "empty_response"
  | "download_http_failed"
  | "download_empty"
  | "download_timeout"
  | "download_content_too_large"
  | "download_url_rejected"
  | "materialize_write_failed"
  | "invalid_pdf_rejected"
  | "download_or_materialize_failed"
  | "open_failed"
  | "unknown";

export type BodyScanRuntimeDevStatus = {
  readonly operation: BodyScanRuntimeDevOperation;
  readonly stage: BodyScanRuntimeDevStage;
  readonly status: BodyScanRuntimeDevStatusValue;
  readonly jsToken?: typeof BODY_SCAN_RUNTIME_JS_TOKEN;
  readonly httpBucket?: BodyScanRuntimeDevHttpBucket;
  readonly byteBucket?: BodyScanRuntimeDevByteBucket;
  readonly safeReasonCode?: BodyScanRuntimeDevSafeReason;
  readonly hasScanId?: boolean;
  readonly observedAtMs: number;
};

const ALLOWED_OPERATIONS = new Set<string>(["reprocess", "original_report", "js_identity"]);
const ALLOWED_STAGES = new Set<string>([
  "js_token",
  "press",
  "handler_enter",
  "early_return",
  "request_start",
  "response",
  "refetch_start",
  "refetch_complete",
  "grant_start",
  "grant_success",
  "grant_failed",
  "policy_pass",
  "policy_fail",
  "fetch_start",
  "fetch_response",
  "bytes_validated",
  "in_memory_pdf_magic",
  "partial_write",
  "after_write_pdf_magic",
  "pdf_validation",
  "rename_final",
  "native_open",
  "native_close",
  "cleanup_complete",
]);
const ALLOWED_STATUS = new Set<string>(["started", "ok", "failed"]);
const ALLOWED_HTTP = new Set<string>([
  "none",
  "2xx",
  "3xx",
  "4xx",
  "5xx",
  "network",
  "timeout",
  "unknown",
]);
const ALLOWED_BYTES = new Set<string>(["zero", "small", "normal", "oversized", "unknown"]);
const ALLOWED_REASONS = new Set<string>([
  "missing_auth",
  "missing_scan_id",
  "not_retryable",
  "http_failed",
  "contract_failed",
  "network_failed",
  "timeout",
  "invalid_url",
  "insecure_scheme",
  "host_not_allowed",
  "redirect_rejected",
  "content_too_large",
  "empty_response",
  "download_http_failed",
  "download_empty",
  "download_timeout",
  "download_content_too_large",
  "download_url_rejected",
  "materialize_write_failed",
  "invalid_pdf_rejected",
  "download_or_materialize_failed",
  "open_failed",
  "unknown",
]);

export function isBodyScanRuntimeDevToolsEnabled(
  env: { __DEV__?: boolean } = globalThis as { __DEV__?: boolean },
): boolean {
  return env.__DEV__ === true;
}

export function httpStatusToDevBucket(status: number | null | undefined): BodyScanRuntimeDevHttpBucket {
  if (status == null || !Number.isFinite(status) || status <= 0) return "unknown";
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "unknown";
}

export function byteLengthToDevBucket(byteLength: number): BodyScanRuntimeDevByteBucket {
  if (!Number.isFinite(byteLength) || byteLength < 0) return "unknown";
  if (byteLength === 0) return "zero";
  if (byteLength < 1024) return "small";
  if (byteLength <= 5 * 1024 * 1024) return "normal";
  return "oversized";
}

function sanitize(input: Record<string, unknown>): BodyScanRuntimeDevStatus {
  const operation = ALLOWED_OPERATIONS.has(String(input.operation))
    ? (input.operation as BodyScanRuntimeDevOperation)
    : "reprocess";
  const stage = ALLOWED_STAGES.has(String(input.stage))
    ? (input.stage as BodyScanRuntimeDevStage)
    : "press";
  const status = ALLOWED_STATUS.has(String(input.status))
    ? (input.status as BodyScanRuntimeDevStatusValue)
    : "failed";
  const out: BodyScanRuntimeDevStatus = {
    operation,
    stage,
    status,
    observedAtMs:
      typeof input.observedAtMs === "number" && Number.isFinite(input.observedAtMs)
        ? input.observedAtMs
        : Date.now(),
  };
  if (input.jsToken === BODY_SCAN_RUNTIME_JS_TOKEN) {
    (out as { jsToken?: typeof BODY_SCAN_RUNTIME_JS_TOKEN }).jsToken = BODY_SCAN_RUNTIME_JS_TOKEN;
  }
  if (ALLOWED_HTTP.has(String(input.httpBucket))) {
    (out as { httpBucket?: BodyScanRuntimeDevHttpBucket }).httpBucket =
      input.httpBucket as BodyScanRuntimeDevHttpBucket;
  }
  if (ALLOWED_BYTES.has(String(input.byteBucket))) {
    (out as { byteBucket?: BodyScanRuntimeDevByteBucket }).byteBucket =
      input.byteBucket as BodyScanRuntimeDevByteBucket;
  }
  if (ALLOWED_REASONS.has(String(input.safeReasonCode))) {
    (out as { safeReasonCode?: BodyScanRuntimeDevSafeReason }).safeReasonCode =
      input.safeReasonCode as BodyScanRuntimeDevSafeReason;
  }
  if (typeof input.hasScanId === "boolean") {
    (out as { hasScanId?: boolean }).hasScanId = input.hasScanId;
  }
  return out;
}

export function serializeBodyScanRuntimeDevStatus(status: BodyScanRuntimeDevStatus): string {
  return JSON.stringify(status);
}

export function emitBodyScanRuntimeDevStatus(
  input: Omit<BodyScanRuntimeDevStatus, "observedAtMs"> & { observedAtMs?: number },
): BodyScanRuntimeDevStatus | null {
  if (!isBodyScanRuntimeDevToolsEnabled()) return null;
  const status = sanitize({
    ...input,
    observedAtMs: input.observedAtMs ?? Date.now(),
  } as unknown as Record<string, unknown>);
  // eslint-disable-next-line no-console
  console.info(`${BODY_SCAN_RUNTIME_DEV_EVENT_PREFIX} ${serializeBodyScanRuntimeDevStatus(status)}`);
  return status;
}

export function emitBodyScanRuntimeJsToken(): BodyScanRuntimeDevStatus | null {
  return emitBodyScanRuntimeDevStatus({
    operation: "js_identity",
    stage: "js_token",
    status: "ok",
    jsToken: BODY_SCAN_RUNTIME_JS_TOKEN,
  });
}
