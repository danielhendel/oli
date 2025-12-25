// lib/api/http.ts

type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

export type ApiResult =
  | { ok: true; status: number; json: JsonValue }
  | { ok: false; status: number; error: string; json?: JsonValue };

export type RequestOptions = { timeoutMs?: number };
export type AuthedPostOptions = { timeoutMs?: number; idempotencyKey?: string };

const getBaseUrl = (): string => {
  const explicit = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.trim().replace(/\/+$/, "");
  throw new Error("Missing EXPO_PUBLIC_BACKEND_BASE_URL (must point to STAGING Cloud Run).");
};

const joinUrl = (base: string, path: string): string => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};

const parseJsonSafely = (text: string): JsonValue | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
};

const withTimeout = async <T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(t);
  }
};

const networkErrorMessage = (e: unknown, url: string): string => {
  const msg = e instanceof Error ? e.message : "Network error";
  return `${msg} (check API at ${url})`;
};

export const apiGetJson = async (path: string, opts?: RequestOptions): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, { method: "GET", signal });
      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        return json
          ? { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})` };
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return { ok: false as const, status: 0, error: networkErrorMessage(e, url) };
  }
};

export const apiPostJson = async (
  path: string,
  body: unknown,
  opts?: { timeoutMs?: number; headers?: Record<string, string> }
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          ...(opts?.headers ?? {}),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        return json
          ? { ok: false as const, status: res.status, error: `POST ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `POST ${path} failed (${res.status})` };
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return { ok: false as const, status: 0, error: networkErrorMessage(e, url) };
  }
};

export const apiGetJsonAuthed = async (
  path: string,
  idToken: string,
  opts?: RequestOptions
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "GET",
        signal,
        headers: { Authorization: `Bearer ${idToken}` },
      });

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        return json
          ? { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})` };
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return { ok: false as const, status: 0, error: networkErrorMessage(e, url) };
  }
};

export const apiPostJsonAuthed = async (
  path: string,
  body: unknown,
  idToken: string,
  opts?: AuthedPostOptions
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);

  const idempotencyKey = opts?.idempotencyKey?.trim();
  const extraHeaders: Record<string, string> = {};
  if (idempotencyKey) {
    // Matches common Cloud Run idempotency patterns, and aligns with how your API uses idempotency.
    extraHeaders["Idempotency-Key"] = idempotencyKey;
  }

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        return json
          ? { ok: false as const, status: res.status, error: `POST ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `POST ${path} failed (${res.status})` };
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return { ok: false as const, status: 0, error: networkErrorMessage(e, url) };
  }
};
