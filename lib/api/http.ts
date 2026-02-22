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
  json?: JsonValue; // optional, only present when we actually have one
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

function appendCacheBust(url: string, cacheBust?: string): string {
  if (!cacheBust) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${encodeURIComponent(cacheBust)}`;
}

function normalizeBaseUrl(base: string): string {
  // Avoid accidental double slashes when callers pass "/path"
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function snippet(text: string, max = 300): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/** Human-friendly message for 401/403 when body is HTML (e.g. Cloud Run / gateway error page). */
function authErrorFriendlyMessage(status: number, bodyText: string): string {
  if (status !== 401 && status !== 403) return "";
  const looksLikeHtml =
    /^\s*</.test(bodyText) ||
    bodyText.toLowerCase().includes("<!doctype") ||
    bodyText.toLowerCase().includes("<html");
  return looksLikeHtml ? "Not authorized — please sign in again" : "";
}

function toHeaderRecord(headers: RequestInit["headers"]): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [k, v] of headers) out[String(k).toLowerCase()] = String(v);
    return out;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers as Record<string, string>)) {
    out[k.toLowerCase()] = String(v);
  }
  return out;
}

function hasApiKeyInUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.searchParams.has("key");
  } catch {
    // Fail-closed: if URL parsing fails, treat as not present.
    return false;
  }
}

function redactUrlForLogs(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (u.searchParams.has("key")) u.searchParams.set("key", "REDACTED");
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function safeNetTraceLog(fields: Record<string, unknown>): void {
  // DEV ONLY: keep deterministic network traces without shipping logs.
  if (!__DEV__) return;
  // Silence Jest/CI to keep logs clean and deterministic.
  if (process.env.JEST_WORKER_ID) return;
  // No secrets: url is redacted (key=REDACTED) + booleans + status + requestId.
  // eslint-disable-next-line no-console
  console.log("[NET_TRACE]", JSON.stringify(fields));
}

function isGatewayBaseUrl(base: string): boolean {
  try {
    const u = new URL(base);
    return u.hostname.endsWith(".uc.gateway.dev");
  } catch {
    return false;
  }
}

function appendQueryParam(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

function requireGatewayApiKey(): string | null {
  const k = process.env.EXPO_PUBLIC_GATEWAY_API_KEY;
  if (!k) return null;
  const trimmed = k.trim();
  if (!trimmed) return null;
  return trimmed;
}

async function apiFetchJson<T>(url: string, init: RequestInit, timeoutMs?: number): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const t = timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), t);

  // ---- instrumentation (privacy-safe) ----
  const h = toHeaderRecord(init.headers);
  const hasAuthHeader = typeof h["authorization"] === "string" && h["authorization"].trim().length > 0;
  const hasForwardedAuthHeader =
    typeof h["x-forwarded-authorization"] === "string" && h["x-forwarded-authorization"].trim().length > 0;
  const hasApiKeyHeader = typeof h["x-api-key"] === "string" && h["x-api-key"].trim().length > 0;
  const hasApiKeyQueryParam = hasApiKeyInUrl(url);
  const method = (init.method ?? "GET").toUpperCase();
  const urlForLogs = redactUrlForLogs(url);
  // ----------------------------------------

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      // defensive: helps some fetch implementations avoid caching
      cache: "no-store",
    });

    const rid = res.headers.get("x-request-id") ?? null;
    const status = res.status;

    // ---- instrumentation (privacy-safe) ----
    safeNetTraceLog({
      method,
      url: urlForLogs,
      hasAuthHeader,
      hasForwardedAuthHeader,
      hasApiKeyHeader,
      hasApiKeyQueryParam,
      status,
      requestId: rid ?? "missing",
    });
    // ----------------------------------------

    const text = await res.text();

    // Attempt to parse JSON if there is a body.
    // Important behavior:
    // - If res.ok === false and body is NOT JSON, return kind:"http" with a body snippet (don't mask as parse error).
    // - If res.ok === true and body is NOT JSON, that's a real API bug; return kind:"parse".
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
          return {
            ok: false,
            status,
            kind: "http",
            error,
            requestId: rid,
          };
        }
        return {
          ok: false,
          status,
          kind: "parse",
          error: "Invalid JSON response",
          requestId: rid,
        };
      }
    }

    if (!res.ok) {
      // 401/403 with HTML body: show friendly auth message (e.g. gateway/Cloud Run error page).
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

    // Success: if no body, return null as T.
    if (parsedUnknown === null) {
      return { ok: true, status, requestId: rid, json: null as unknown as T };
    }

    return { ok: true, status, requestId: rid, json: parsedUnknown as T };
  } catch (e: unknown) {
    // Make aborts/timeouts explicit (fetch throws AbortError in most environments)
    const isAbort =
      typeof e === "object" &&
      e !== null &&
      "name" in e &&
      typeof (e as { name?: unknown }).name === "string" &&
      (e as { name: string }).name === "AbortError";

    const msg = isAbort ? "Request timed out" : e instanceof Error ? e.message : "Network error";

    // ---- instrumentation (privacy-safe) ----
    safeNetTraceLog({
      method,
      url: urlForLogs,
      hasAuthHeader,
      hasForwardedAuthHeader,
      hasApiKeyHeader,
      hasApiKeyQueryParam,
      status: 0,
      requestId: "missing",
      networkError: msg,
    });
    // ----------------------------------------

    return { ok: false, status: 0, kind: "network", error: msg, requestId: null };
  } finally {
    clearTimeout(timer);
  }
}

type HeaderOptions = { noStore?: true; idempotencyKey?: string };

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

  return headers;
}

export async function apiGetJsonAuthed<T>(path: string, idToken: string, opts?: GetOptions): Promise<ApiResult<T>> {
  const baseRaw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (__DEV__ && !process.env.JEST_WORKER_ID) console.log("DEBUG_BACKEND_BASE_URL", baseRaw);
  if (!baseRaw) {
    return {
      ok: false,
      status: 0,
      kind: "unknown",
      error: "Missing EXPO_PUBLIC_BACKEND_BASE_URL",
      requestId: null,
    };
  }

  const base = normalizeBaseUrl(baseRaw);
  let url = appendCacheBust(`${base}${path}`, opts?.cacheBust);

  // Fail-closed: gateway requires API key (consumer identity).
  if (isGatewayBaseUrl(base)) {
    const apiKey = requireGatewayApiKey();
    if (!apiKey) {
      return {
        ok: false,
        status: 0,
        kind: "unknown",
        error: "Missing EXPO_PUBLIC_GATEWAY_API_KEY (required for API Gateway)",
        requestId: null,
      };
    }
    url = appendQueryParam(url, "key", apiKey);
  }

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;

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
  const baseRaw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (__DEV__ && !process.env.JEST_WORKER_ID) console.log("DEBUG_BACKEND_BASE_URL", baseRaw);
  if (!baseRaw) {
    return {
      ok: false,
      status: 0,
      kind: "unknown",
      error: "Missing EXPO_PUBLIC_BACKEND_BASE_URL",
      requestId: null,
    };
  }

  const base = normalizeBaseUrl(baseRaw);
  let url = `${base}${path}`;

  // Fail-closed: gateway requires API key (consumer identity).
  if (isGatewayBaseUrl(base)) {
    const apiKey = requireGatewayApiKey();
    if (!apiKey) {
      return {
        ok: false,
        status: 0,
        kind: "unknown",
        error: "Missing EXPO_PUBLIC_GATEWAY_API_KEY (required for API Gateway)",
        requestId: null,
      };
    }
    url = appendQueryParam(url, "key", apiKey);
  }

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
  const baseRaw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (__DEV__ && !process.env.JEST_WORKER_ID) console.log("DEBUG_BACKEND_BASE_URL", baseRaw);
  if (!baseRaw) {
    return {
      ok: false,
      status: 0,
      kind: "unknown",
      error: "Missing EXPO_PUBLIC_BACKEND_BASE_URL",
      requestId: null,
    };
  }

  const base = normalizeBaseUrl(baseRaw);
  let url = `${base}${path}`;

  // Fail-closed: gateway requires API key (consumer identity).
  if (isGatewayBaseUrl(base)) {
    const apiKey = requireGatewayApiKey();
    if (!apiKey) {
      return {
        ok: false,
        status: 0,
        kind: "unknown",
        error: "Missing EXPO_PUBLIC_GATEWAY_API_KEY (required for API Gateway)",
        requestId: null,
      };
    }
    url = appendQueryParam(url, "key", apiKey);
  }

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;

  const headers = buildHeaders(headerOpts);
  headers.Authorization = `Bearer ${idToken}`;

  const bodyStr = JSON.stringify(body);

  return apiFetchJson<T>(url, { method: "PUT", headers, body: bodyStr }, opts?.timeoutMs);
}