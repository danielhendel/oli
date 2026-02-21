// lib/api/http.ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type FailureKind = "network" | "http" | "parse" | "contract" | "unknown";

export type ApiOk<T> = {
  ok: true;
  status: number;
  requestId: string | null;
  json: T;
};

export type ApiFailure = {
  ok: false;
  status: number;
  kind: FailureKind;
  error: string;
  requestId: string | null;
  json?: JsonValue;
};

export type ApiResult<T> = ApiOk<T> | ApiFailure;

export type GetOptions = {
  cacheBust?: string;
  noStore?: boolean;
  timeoutMs?: number;
};

export type PostOptions = {
  idempotencyKey?: string;
  timeoutMs?: number;
  noStore?: boolean;
};

export type PutOptions = {
  timeoutMs?: number;
  noStore?: boolean;
};

const REQUIRED_GATEWAY_BASE_URL = "https://oli-gateway-cw04f997.uc.gateway.dev" as const;
const REQUIRED_GATEWAY_HOST = "oli-gateway-cw04f997.uc.gateway.dev" as const;

// ===== Test-only override (must be explicitly set by tests) =====
let __testBaseUrlOverride: string | null = null;

/**
 * Test hook: set API base URL override for unit tests only.
 * Fail-closed: throws if used outside NODE_ENV==="test".
 */
export function __setApiBaseUrlForTests(base: string | null): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("__setApiBaseUrlForTests may only be used in tests");
  }
  __testBaseUrlOverride = base ? base.trim() : null;
}

function isJsonValue(v: unknown): v is JsonValue {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(v)) return v.every(isJsonValue);
  if (t === "object") {
    const rec = v as Record<string, unknown>;
    return Object.values(rec).every(isJsonValue);
  }
  return false;
}

function normalizeBaseUrl(base: string): string {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function snippet(text: string, max = 300): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function authErrorFriendlyMessage(status: number, bodyText: string): string {
  if (status !== 401 && status !== 403) return "";
  const looksLikeHtml =
    /^\s*</.test(bodyText) ||
    bodyText.toLowerCase().includes("<!doctype") ||
    bodyText.toLowerCase().includes("<html");
  return looksLikeHtml ? "Not authorized — please sign in again" : "";
}

/**
 * Fail-closed base URL resolution.
 * - In prod/dev: ONLY the API Gateway base URL is allowed.
 * - In tests: base URL must be explicitly set via __setApiBaseUrlForTests().
 */
function getRequiredApiBaseUrl(): ApiResult<string> {
  if (process.env.NODE_ENV === "test") {
    if (!__testBaseUrlOverride) {
      return {
        ok: false,
        status: 0,
        kind: "contract",
        error: "Test misconfigured: API base URL override not set. Call __setApiBaseUrlForTests(baseUrl).",
        requestId: null,
      };
    }
    const base = normalizeBaseUrl(__testBaseUrlOverride);
    try {
      // eslint-disable-next-line no-new
      new URL(base);
    } catch {
      return {
        ok: false,
        status: 0,
        kind: "contract",
        error: "Test misconfigured: invalid API base URL override.",
        requestId: null,
      };
    }
    return { ok: true, status: 200, requestId: null, json: base };
  }

  const baseRaw = (process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "").trim();
  if (!baseRaw) {
    return {
      ok: false,
      status: 0,
      kind: "contract",
      error: "Client misconfigured: missing EXPO_PUBLIC_BACKEND_BASE_URL (must be API Gateway).",
      requestId: null,
    };
  }

  const base = normalizeBaseUrl(baseRaw);

  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    return {
      ok: false,
      status: 0,
      kind: "contract",
      error: "Client misconfigured: invalid EXPO_PUBLIC_BACKEND_BASE_URL (must be API Gateway).",
      requestId: null,
    };
  }

  if (host !== REQUIRED_GATEWAY_HOST || base !== REQUIRED_GATEWAY_BASE_URL) {
    return {
      ok: false,
      status: 0,
      kind: "contract",
      error:
        `Client misconfigured: EXPO_PUBLIC_BACKEND_BASE_URL must equal ` +
        `${REQUIRED_GATEWAY_BASE_URL} (got host=${host}).`,
      requestId: null,
    };
  }

  return { ok: true, status: 200, requestId: null, json: base };
}

async function apiFetchJson<T>(url: string, init: RequestInit, timeoutMs?: number): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const t = timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), t);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    const rid = res.headers.get("x-request-id") ?? null;
    const status = res.status;

    const text = await res.text();

    let parsedUnknown: unknown = null;
    let parsedJson: JsonValue | undefined;

    if (text) {
      try {
        parsedUnknown = JSON.parse(text) as unknown;
        parsedJson = parsedUnknown !== null && isJsonValue(parsedUnknown) ? parsedUnknown : undefined;
      } catch {
        if (!res.ok) {
          const friendly = authErrorFriendlyMessage(status, text);
          const bodySnippet = snippet(text);
          const error = friendly || (bodySnippet ? `HTTP ${status}: ${bodySnippet}` : `HTTP ${status}`);
          return { ok: false, status, kind: "http", error, requestId: rid };
        }
        return { ok: false, status, kind: "parse", error: "Invalid JSON response", requestId: rid };
      }
    }

    if (!res.ok) {
      const friendly = authErrorFriendlyMessage(status, text);
      const error = friendly || `HTTP ${status}`;
      return {
        ok: false,
        status,
        kind: "http",
        error,
        requestId: rid,
        ...(parsedJson !== undefined ? { json: parsedJson } : {}),
      };
    }

    if (parsedUnknown === null) {
      return { ok: true, status, requestId: rid, json: null as unknown as T };
    }

    return { ok: true, status, requestId: rid, json: parsedUnknown as T };
  } catch (e: unknown) {
    const isAbort =
      typeof e === "object" &&
      e !== null &&
      "name" in e &&
      typeof (e as { name?: unknown }).name === "string" &&
      (e as { name: string }).name === "AbortError";

    const msg = isAbort ? "Request timed out" : e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, kind: "network", error: msg, requestId: null };
  } finally {
    clearTimeout(timer);
  }
}

type HeaderOptions = { noStore?: true; idempotencyKey?: string; cacheBust?: string };

function buildHeaders(opts?: HeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (opts?.noStore) {
    headers["Cache-Control"] = "no-store";
    headers["Pragma"] = "no-cache";
  }
  if (opts?.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }
  if (opts?.cacheBust) {
    // IMPORTANT: strict backend rejects unknown query params.
    // Cache-bust MUST be out-of-band (header), not `?t=...`.
    headers["X-Cache-Bust"] = opts.cacheBust;
  }

  return headers;
}

export async function apiGetJsonAuthed<T>(path: string, idToken: string, opts?: GetOptions): Promise<ApiResult<T>> {
  const baseRes = getRequiredApiBaseUrl();
  if (!baseRes.ok) return baseRes;

  // Do NOT append cache-bust as query param (strict backend).
  const url = `${baseRes.json}${path}`;

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;
  if (opts?.cacheBust) headerOpts.cacheBust = opts.cacheBust;

  const headers = buildHeaders(headerOpts);
  headers.Authorization = `Bearer ${idToken}`;

  return apiFetchJson<T>(url, { method: "GET", headers }, opts?.timeoutMs);
}

export async function apiPostJsonAuthed<T>(
  path: string,
  body: unknown,
  idToken: string,
  opts?: PostOptions,
): Promise<ApiResult<T>> {
  const baseRes = getRequiredApiBaseUrl();
  if (!baseRes.ok) return baseRes;

  const url = `${baseRes.json}${path}`;

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;
  if (opts?.idempotencyKey) headerOpts.idempotencyKey = opts.idempotencyKey;

  const headers = buildHeaders(headerOpts);
  headers.Authorization = `Bearer ${idToken}`;

  const bodyStr = JSON.stringify(body);

  return apiFetchJson<T>(url, { method: "POST", headers, body: bodyStr }, opts?.timeoutMs);
}

export async function apiPutJsonAuthed<T>(
  path: string,
  body: unknown,
  idToken: string,
  opts?: PutOptions,
): Promise<ApiResult<T>> {
  const baseRes = getRequiredApiBaseUrl();
  if (!baseRes.ok) return baseRes;

  const url = `${baseRes.json}${path}`;

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;

  const headers = buildHeaders(headerOpts);
  headers.Authorization = `Bearer ${idToken}`;

  const bodyStr = JSON.stringify(body);

  return apiFetchJson<T>(url, { method: "PUT", headers, body: bodyStr }, opts?.timeoutMs);
}