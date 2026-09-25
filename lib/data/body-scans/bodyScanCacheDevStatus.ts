/**
 * DEV-only safe Body Scan cache lifecycle status (physical harness observability).
 *
 * Never carries UID, document/scan IDs, paths, filenames, URLs, or health values.
 * Emissions are no-ops outside `__DEV__`.
 */

export const BODY_SCAN_CACHE_DEV_EVENT_PREFIX = "[BODY_SCAN_CACHE_DEV]" as const;

export type BodyScanCacheDevOperation =
  | "preview_open"
  | "preview_close_cleanup"
  | "preview_failure_cleanup"
  | "stale_sweep"
  | "account_cleanup"
  | "document_cleanup";

export type BodyScanCacheDevStatusValue = "started" | "ok" | "failed";

export type BodyScanCacheDevCountBucket =
  | "zero"
  | "one"
  | "two_to_five"
  | "more_than_five"
  | "unknown";

export type BodyScanCacheDevPartialBucket = "zero" | "one" | "more_than_one" | "unknown";

export type BodyScanCacheDevSafeReason =
  | "fallback_requires_stale_cleanup"
  | "invalid_pdf_rejected"
  | "download_or_materialize_failed"
  | "open_failed"
  | "cleanup_failed"
  | "not_dev"
  | "no_auth";

export type BodyScanCacheDevStatus = {
  readonly operation: BodyScanCacheDevOperation;
  readonly status: BodyScanCacheDevStatusValue;
  readonly remainingFileCountBucket: BodyScanCacheDevCountBucket;
  readonly removedFileCountBucket: BodyScanCacheDevCountBucket;
  readonly partialFileCountBucket: BodyScanCacheDevPartialBucket;
  readonly safeReasonCode?: BodyScanCacheDevSafeReason;
  readonly observedAtMs: number;
};

const ALLOWED_OPERATIONS = new Set<string>([
  "preview_open",
  "preview_close_cleanup",
  "preview_failure_cleanup",
  "stale_sweep",
  "account_cleanup",
  "document_cleanup",
]);

const ALLOWED_STATUSES = new Set<string>(["started", "ok", "failed"]);
const ALLOWED_COUNT = new Set<string>(["zero", "one", "two_to_five", "more_than_five", "unknown"]);
const ALLOWED_PARTIAL = new Set<string>(["zero", "one", "more_than_one", "unknown"]);
const ALLOWED_REASONS = new Set<string>([
  "fallback_requires_stale_cleanup",
  "invalid_pdf_rejected",
  "download_or_materialize_failed",
  "open_failed",
  "cleanup_failed",
  "not_dev",
  "no_auth",
]);

export function isBodyScanCacheDevToolsEnabled(
  env: { __DEV__?: boolean } = globalThis as { __DEV__?: boolean },
): boolean {
  return env.__DEV__ === true;
}

export function countToDevBucket(count: number): BodyScanCacheDevCountBucket {
  if (!Number.isFinite(count) || count < 0) return "unknown";
  if (count === 0) return "zero";
  if (count === 1) return "one";
  if (count <= 5) return "two_to_five";
  return "more_than_five";
}

export function countToPartialBucket(count: number): BodyScanCacheDevPartialBucket {
  if (!Number.isFinite(count) || count < 0) return "unknown";
  if (count === 0) return "zero";
  if (count === 1) return "one";
  return "more_than_one";
}

export function mapLegacyDeletedBucket(
  bucket: "0" | "1" | "2_5" | "6_plus",
): BodyScanCacheDevCountBucket {
  switch (bucket) {
    case "0":
      return "zero";
    case "1":
      return "one";
    case "2_5":
      return "two_to_five";
    case "6_plus":
      return "more_than_five";
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}

/**
 * Sanitize arbitrary input into a safe status object.
 * Drops unknown keys and coerces invalid enum values to safe defaults.
 */
export function sanitizeBodyScanCacheDevStatus(
  input: Record<string, unknown>,
  now: () => number = Date.now,
): BodyScanCacheDevStatus {
  const operation = ALLOWED_OPERATIONS.has(String(input.operation))
    ? (input.operation as BodyScanCacheDevOperation)
    : "preview_open";
  const status = ALLOWED_STATUSES.has(String(input.status))
    ? (input.status as BodyScanCacheDevStatusValue)
    : "failed";
  const remainingFileCountBucket = ALLOWED_COUNT.has(String(input.remainingFileCountBucket))
    ? (input.remainingFileCountBucket as BodyScanCacheDevCountBucket)
    : "unknown";
  const removedFileCountBucket = ALLOWED_COUNT.has(String(input.removedFileCountBucket))
    ? (input.removedFileCountBucket as BodyScanCacheDevCountBucket)
    : "unknown";
  const partialFileCountBucket = ALLOWED_PARTIAL.has(String(input.partialFileCountBucket))
    ? (input.partialFileCountBucket as BodyScanCacheDevPartialBucket)
    : "unknown";
  const reasonRaw = input.safeReasonCode;
  const safeReasonCode =
    typeof reasonRaw === "string" && ALLOWED_REASONS.has(reasonRaw)
      ? (reasonRaw as BodyScanCacheDevSafeReason)
      : undefined;

  const base: BodyScanCacheDevStatus = {
    operation,
    status,
    remainingFileCountBucket,
    removedFileCountBucket,
    partialFileCountBucket,
    observedAtMs: now(),
  };
  return safeReasonCode != null ? { ...base, safeReasonCode } : base;
}

export function serializeBodyScanCacheDevStatus(status: BodyScanCacheDevStatus): string {
  const safe = sanitizeBodyScanCacheDevStatus(status as unknown as Record<string, unknown>);
  return JSON.stringify({
    operation: safe.operation,
    status: safe.status,
    remainingFileCountBucket: safe.remainingFileCountBucket,
    removedFileCountBucket: safe.removedFileCountBucket,
    partialFileCountBucket: safe.partialFileCountBucket,
    ...(safe.safeReasonCode != null ? { safeReasonCode: safe.safeReasonCode } : {}),
  });
}

type Listener = (status: BodyScanCacheDevStatus) => void;

let lastStatus: BodyScanCacheDevStatus | null = null;
const listeners = new Set<Listener>();

export function getLastBodyScanCacheDevStatus(): BodyScanCacheDevStatus | null {
  return lastStatus;
}

export function clearBodyScanCacheDevStatus(): void {
  lastStatus = null;
}

export function subscribeBodyScanCacheDevStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only reset. */
export function __testing_resetBodyScanCacheDevStatus(): void {
  lastStatus = null;
  listeners.clear();
}

/**
 * Emit a safe DEV status. No-op outside `__DEV__`.
 * Never logs paths, IDs, or URLs — only the sanitized enum payload.
 */
export function emitBodyScanCacheDevStatus(
  input: Omit<BodyScanCacheDevStatus, "observedAtMs"> & { observedAtMs?: number },
): BodyScanCacheDevStatus | null {
  if (!isBodyScanCacheDevToolsEnabled()) return null;
  const status = sanitizeBodyScanCacheDevStatus({
    ...input,
    observedAtMs: input.observedAtMs ?? Date.now(),
  } as unknown as Record<string, unknown>);
  lastStatus = status;
  for (const listener of listeners) {
    try {
      listener(status);
    } catch {
      // Ignore listener failures.
    }
  }
  // eslint-disable-next-line no-console
  console.info(`${BODY_SCAN_CACHE_DEV_EVENT_PREFIX} ${serializeBodyScanCacheDevStatus(status)}`);
  return status;
}
