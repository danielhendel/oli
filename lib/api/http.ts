// lib/api/http.ts

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type FailureKind = "network" | "http" | "parse" | "unknown";

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

  /**
   * Optional parsed JSON body from the server (useful for structured errors).
   * Present only when the response body is valid JSON.
   */
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

  /**
   * Correlation/idempotency id sent as `x-request-id`.
   * Required by some gateway routes (e.g. POST /account/delete).
   */
  requestId?: string;

  timeoutMs?: number;
  noStore?: boolean;
};

type HeaderOptions = {
  noStore?: true;
  idempotencyKey?: string;
  requestId?: string;
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
  if (opts?.requestId) {
    headers["x-request-id"] = opts.requestId;
  }

  return headers;
}

function normalizeBaseUrl(base: string): string {
  // allow user to set with or without trailing slash
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function appendCacheBust(url: string, cacheBust?: string): string {
  if (!cacheBust) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}cb=${encodeURIComponent(cacheBust)}`;
}

function headerRequestId(res: Response): string | null {
  // gateway may echo x-request-id
  return res.headers.get("x-request-id") ?? res.headers.get("X-Request-Id") ?? null;
}

async function apiFetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const t = timeoutMs && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const requestId = headerRequestId(res);

    // Read body as text first to handle empty bodies safely.
    const text = await res.text();

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      let errJson: JsonValue | undefined = undefined;

      if (text) {
        try {
          const parsed = JSON.parse(text) as unknown;

          if (isJsonValue(parsed)) {
            errJson = parsed;
          }

          if (typeof parsed === "string") {
            errMsg = parsed;
          } else if (parsed && typeof parsed === "object") {
            const rec = parsed as Record<string, unknown>;
            const msg = rec.error ?? rec.message ?? rec.detail;
            if (typeof msg === "string" && msg.trim()) errMsg = msg;
          }
        } catch {
          // keep errMsg, but append raw text if short
          const trimmed = text.trim();
          if (trimmed && trimmed.length <= 300) errMsg = `${errMsg}: ${trimmed}`;
        }
      }

      return {
        ok: false,
        status: res.status,
        kind: "http",
        error: errMsg,
        requestId,
        ...(errJson !== undefined ? { json: errJson } : {}),
      };
    }

    // Success: parse JSON if present
    if (!text) {
      // Some endpoints may return empty 204/202 bodies; let caller decide.
      return { ok: true, status: res.status, requestId, json: undefined as unknown as T };
    }

    try {
      const parsed = JSON.parse(text) as unknown;

      // Optional: validate JsonValue shape to catch weird parses early.
      if (!isJsonValue(parsed)) {
        return {
          ok: false,
          status: res.status,
          kind: "parse",
          error: "Response was not valid JSON value",
          requestId,
        };
      }

      return { ok: true, status: res.status, requestId, json: parsed as unknown as T };
    } catch (e) {
      return {
        ok: false,
        status: res.status,
        kind: "parse",
        error: e instanceof Error ? e.message : "Failed to parse JSON",
        requestId,
      };
    }
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.name === "AbortError"
          ? "Request timed out"
          : e.message
        : "Network error";
    return { ok: false, status: 0, kind: "network", error: msg, requestId: null };
  } finally {
    if (t) clearTimeout(t);
  }
}

export async function apiGetJsonAuthed<T>(
  path: string,
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<T>> {
  const baseRaw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
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
  const url = appendCacheBust(`${base}${path}`, opts?.cacheBust);

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
  const url = `${base}${path}`;

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;
  if (opts?.idempotencyKey) headerOpts.idempotencyKey = opts.idempotencyKey;
  if (opts?.requestId) headerOpts.requestId = opts.requestId;

  const headers = buildHeaders(headerOpts);
  headers.Authorization = `Bearer ${idToken}`;

  return apiFetchJson<T>(
    url,
    { method: "POST", headers, body: JSON.stringify(body) },
    opts?.timeoutMs,
  );
}
