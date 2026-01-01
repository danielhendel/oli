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

async function apiFetchJson<T>(url: string, init: RequestInit, timeoutMs?: number): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const t = timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), t);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      // defensive: helps some fetch implementations avoid caching
      cache: "no-store",
    });

    const rid = res.headers.get("x-request-id") ?? null;
    const status = res.status;

    const text = await res.text();

    // If there is a body, it must be valid JSON in our API.
    let parsedUnknown: unknown = null;
    if (text) {
      try {
        parsedUnknown = JSON.parse(text) as unknown;
      } catch {
        return {
          ok: false,
          status,
          kind: "parse",
          error: "Invalid JSON response",
          requestId: rid,
        };
      }
    }

    const parsedJson: JsonValue | undefined =
      parsedUnknown !== null && isJsonValue(parsedUnknown) ? parsedUnknown : undefined;

    if (!res.ok) {
      return {
        ok: false,
        status,
        kind: "http",
        error: `HTTP ${status}`,
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
    const msg = e instanceof Error ? e.message : "Network error";
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
  const base = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (!base) {
    return {
      ok: false,
      status: 0,
      kind: "unknown",
      error: "Missing EXPO_PUBLIC_BACKEND_BASE_URL",
      requestId: null,
    };
  }

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
  const base = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (!base) {
    return {
      ok: false,
      status: 0,
      kind: "unknown",
      error: "Missing EXPO_PUBLIC_BACKEND_BASE_URL",
      requestId: null,
    };
  }

  const url = `${base}${path}`;

  const headerOpts: HeaderOptions = {};
  if (opts?.noStore) headerOpts.noStore = true;
  if (opts?.idempotencyKey) headerOpts.idempotencyKey = opts.idempotencyKey;

  const headers = buildHeaders(headerOpts);
  headers.Authorization = `Bearer ${idToken}`;

  const bodyStr = JSON.stringify(body);

  return apiFetchJson<T>(url, { method: "POST", headers, body: bodyStr }, opts?.timeoutMs);
}
