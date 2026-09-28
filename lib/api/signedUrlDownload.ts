/**
 * Bounded Body Scan original-report download from an Oli-issued GCS signed URL.
 *
 * Not a generic URL fetch primitive. Not an Oli API Gateway call — the URL is already
 * owner-scoped and time-bounded by the view-original grant. Lives beside http.ts so the
 * client trust boundary still funnels network I/O through lib/api/*.
 *
 * Never logs, stores, or returns the URL, query string, path, or exception text.
 *
 * Server emission (documentsMe view-original → Admin Storage getSignedUrl without
 * virtualHostedStyle/cname): path-style HTTPS host `storage.googleapis.com` only.
 *
 * React Native / Expo note:
 * Expo's native fetch (winter/fetch) does not implement `redirect: "manual"`.
 * Redirects are followed by the native stack. We therefore:
 * - omit the unsupported redirect mode (do not pretend browser semantics);
 * - re-validate the final `response.url` host against the exact allowlist;
 * - fail closed if a redirect lands off-allowlist or final URL is missing after redirect.
 */

import { DOCUMENT_MAX_BYTE_SIZE } from "@/lib/data/documents/documentValidation";

/** Exact hosts emitted by current view-original signed URL minting. */
export const SIGNED_URL_DOWNLOAD_ALLOWED_HOSTS = ["storage.googleapis.com"] as const;

/** Bounded wait for a ≤5 MiB report over mobile networks (matches account-export style). */
export const SIGNED_URL_DOWNLOAD_TIMEOUT_MS = 30_000;

/** Minimum byte length for a PDF candidate before downstream %PDF validation. */
const MIN_PDF_CANDIDATE_BYTES = 5;

export type SignedUrlDownloadFailureReason =
  | "invalid_url"
  | "insecure_scheme"
  | "host_not_allowed"
  | "redirect_rejected"
  | "timeout"
  | "http_failed"
  | "content_too_large"
  | "empty_response"
  | "network_failed";

export type SignedUrlDownloadResult =
  | { ok: true; bytes: ArrayBuffer }
  | { ok: false; reason: SignedUrlDownloadFailureReason };

export type SignedUrlDownloadStage =
  | "policy_pass"
  | "policy_fail"
  | "fetch_start"
  | "fetch_response"
  | "bytes_validated";

export type SignedUrlDownloadStageEvent = {
  stage: SignedUrlDownloadStage;
  ok: boolean;
  reason?: SignedUrlDownloadFailureReason;
  httpStatus?: number;
  byteLength?: number;
  redirected?: boolean;
};

/**
 * Parse + policy-check a candidate signed URL without fetching.
 * Safe for unit tests; never throws URL text.
 */
export function evaluateSignedUrlDownloadPolicy(
  urlString: string,
): { ok: true; url: URL } | { ok: false; reason: SignedUrlDownloadFailureReason } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "insecure_scheme" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateOrLocalHostname(hostname)) {
    return { ok: false, reason: "host_not_allowed" };
  }

  if (!isAllowedSignedUrlDownloadHost(hostname)) {
    return { ok: false, reason: "host_not_allowed" };
  }

  return { ok: true, url: parsed };
}

export function isAllowedSignedUrlDownloadHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (SIGNED_URL_DOWNLOAD_ALLOWED_HOSTS as readonly string[]).includes(normalized);
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
  // IPv6 link-local / ULA (defensive; allowlist already excludes these).
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!ipv4) return false;
  const parts = ipv4.slice(1).map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function parseContentLengthHeader(
  value: string | null,
): { ok: true; bytes: number | null } | { ok: false } {
  if (value == null || value.trim() === "") return { ok: true, bytes: null };
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n < 0) return { ok: false };
  return { ok: true, bytes: n };
}

/**
 * After native fetch (which may auto-follow redirects), ensure the final URL
 * still matches the exact GCS allowlist. Fail closed on off-allowlist landings.
 */
export function evaluateSignedUrlFinalResponse(
  response: Pick<Response, "url" | "status" | "type" | "redirected" | "ok">,
): { ok: true } | { ok: false; reason: SignedUrlDownloadFailureReason } {
  // Browser opaque-redirect semantic (not emitted by Expo winter fetch, which uses type "default").
  if (response.type === "opaqueredirect") {
    return { ok: false, reason: "redirect_rejected" };
  }
  if (response.status >= 300 && response.status < 400) {
    return { ok: false, reason: "redirect_rejected" };
  }

  const finalUrl = typeof response.url === "string" ? response.url.trim() : "";
  const redirected = response.redirected === true;

  if (finalUrl.length > 0) {
    const policy = evaluateSignedUrlDownloadPolicy(finalUrl);
    if (!policy.ok) {
      return {
        ok: false,
        reason:
          policy.reason === "host_not_allowed" || policy.reason === "insecure_scheme"
            ? "redirect_rejected"
            : policy.reason,
      };
    }
    return { ok: true };
  }

  // Expo should expose response.url; if a redirect occurred without a final URL, fail closed.
  if (redirected) {
    return { ok: false, reason: "redirect_rejected" };
  }
  return { ok: true };
}

async function readResponseArrayBuffer(response: Response): Promise<ArrayBuffer | null> {
  if (typeof response.arrayBuffer === "function") {
    return await response.arrayBuffer();
  }
  // Narrow RN fallback if arrayBuffer is missing but blob exists.
  const withBlob = response as Response & { blob?: () => Promise<Blob> };
  if (typeof withBlob.blob === "function") {
    const blob = await withBlob.blob();
    if (typeof blob.arrayBuffer === "function") {
      return await blob.arrayBuffer();
    }
  }
  return null;
}

/**
 * Fetch bytes from an Oli-issued GCS signed URL under a hard security policy.
 *
 * - HTTPS only, exact host allowlist (request + final response URL)
 * - credentials omitted (signed query is the auth)
 * - Content-Length + actual byteLength ≤ DOCUMENT_MAX_BYTE_SIZE (5 MiB)
 * - AbortController timeout
 * - No `redirect: "manual"` (unsupported on Expo native fetch)
 */
export async function downloadSignedUrlArrayBuffer(
  urlString: string,
  opts?: { onStage?: (event: SignedUrlDownloadStageEvent) => void },
): Promise<SignedUrlDownloadResult> {
  const emit = opts?.onStage;
  const policy = evaluateSignedUrlDownloadPolicy(urlString);
  if (!policy.ok) {
    emit?.({ stage: "policy_fail", ok: false, reason: policy.reason });
    return policy;
  }
  emit?.({ stage: "policy_pass", ok: true });

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, SIGNED_URL_DOWNLOAD_TIMEOUT_MS);

  try {
    emit?.({ stage: "fetch_start", ok: true });
    // Intentionally omit `redirect`: Expo native fetch does not support redirect modes.
    // Final host is re-validated via evaluateSignedUrlFinalResponse after the call.
    const response = await fetch(policy.url.toString(), {
      method: "GET",
      credentials: "omit",
      signal: controller.signal,
    });

    emit?.({
      stage: "fetch_response",
      ok: response.ok,
      httpStatus: response.status,
      redirected: response.redirected === true,
    });

    const finalCheck = evaluateSignedUrlFinalResponse(response);
    if (!finalCheck.ok) {
      return finalCheck;
    }

    if (!response.ok) {
      return { ok: false, reason: "http_failed" };
    }

    const lengthParsed = parseContentLengthHeader(response.headers.get("content-length"));
    if (!lengthParsed.ok) {
      return { ok: false, reason: "http_failed" };
    }
    if (lengthParsed.bytes != null && lengthParsed.bytes > DOCUMENT_MAX_BYTE_SIZE) {
      return { ok: false, reason: "content_too_large" };
    }

    const bytes = await readResponseArrayBuffer(response);
    if (!bytes || bytes.byteLength < MIN_PDF_CANDIDATE_BYTES) {
      emit?.({
        stage: "bytes_validated",
        ok: false,
        reason: "empty_response",
        byteLength: bytes?.byteLength ?? 0,
      });
      return { ok: false, reason: "empty_response" };
    }
    if (bytes.byteLength > DOCUMENT_MAX_BYTE_SIZE) {
      emit?.({
        stage: "bytes_validated",
        ok: false,
        reason: "content_too_large",
        byteLength: bytes.byteLength,
      });
      return { ok: false, reason: "content_too_large" };
    }

    emit?.({ stage: "bytes_validated", ok: true, byteLength: bytes.byteLength });
    return { ok: true, bytes };
  } catch (err) {
    if (isAbortError(err)) {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "network_failed" };
  } finally {
    clearTimeout(timer);
  }
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: unknown }).name) : "";
  return name === "AbortError";
}
