// lib/api/http.ts

type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

export type ApiResult =
  | { ok: true; status: number; json: JsonValue }
  | { ok: false; status: number; error: string; json?: JsonValue };

const getBaseUrl = (): string => {
  const base = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (!base) {
    throw new Error("Missing EXPO_PUBLIC_BACKEND_BASE_URL env var (expected e.g. http://localhost:8080).");
  }
  return base.replace(/\/+$/, "");
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

const parseJsonSafely = (text: string): JsonValue | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
};

export const apiGetJson = async (path: string, opts?: { timeoutMs?: number }): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const result = await withTimeout(async (signal): Promise<ApiResult> => {
      const res = await fetch(url, { method: "GET", signal });
      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        const out: ApiResult = json
          ? { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})` };
        return out;
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 8000);

    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false as const, status: 0, error: msg };
  }
};

export const apiGetJsonAuthed = async (
  path: string,
  idToken: string,
  opts?: { timeoutMs?: number }
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const result = await withTimeout(async (signal): Promise<ApiResult> => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${idToken}`,
      };

      const res = await fetch(url, { method: "GET", headers, signal });
      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        const out: ApiResult = json
          ? { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `GET ${path} failed (${res.status})` };
        return out;
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 8000);

    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false as const, status: 0, error: msg };
  }
};

export const apiPostJsonAuthed = async (
  path: string,
  body: unknown,
  idToken: string,
  opts?: { timeoutMs?: number; idempotencyKey?: string }
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const result = await withTimeout(async (signal): Promise<ApiResult> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      };
      if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      });

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (!res.ok) {
        const out: ApiResult = json
          ? { ok: false as const, status: res.status, error: `POST ${path} failed (${res.status})`, json }
          : { ok: false as const, status: res.status, error: `POST ${path} failed (${res.status})` };
        return out;
      }

      return { ok: true as const, status: res.status, json: json ?? ({} as JsonValue) };
    }, opts?.timeoutMs ?? 12000);

    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false as const, status: 0, error: msg };
  }
};
