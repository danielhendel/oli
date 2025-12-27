// lib/api/http.ts
import { getEnv } from "../env";

type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

export type FailureKind = "network" | "http" | "parse";

export type ApiResult =
  | { ok: true; status: number; json: JsonValue; requestId: string }
  | { ok: false; status: number; error: string; kind: FailureKind; requestId: string; json?: JsonValue };

export type RequestOptions = { timeoutMs?: number };
export type AuthedPostOptions = { timeoutMs?: number; idempotencyKey?: string };

const makeRequestId = (): string =>
  `oli_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;

const getBaseUrl = (): string => getEnv().EXPO_PUBLIC_BACKEND_BASE_URL;

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

const getServerRequestId = (res: Response, fallback: string): string =>
  res.headers.get("x-request-id")?.trim() || fallback;

/**
 * Extracts a human-friendly message from common server error envelopes.
 * Supports:
 *  - { error: { message: string } }
 *  - { error: string }
 */
const extractServerErrorMessage = (json: JsonValue | undefined): string | undefined => {
  if (!json || typeof json !== "object" || Array.isArray(json)) return undefined;

  const rec = json as Record<string, JsonValue>;
  const errVal = rec["error"];

  if (errVal && typeof errVal === "object" && !Array.isArray(errVal)) {
    const msg = (errVal as Record<string, JsonValue>)["message"];
    if (typeof msg === "string") return msg;
  }

  if (typeof errVal === "string") return errVal;

  return undefined;
};

export const apiGetJson = async (path: string, opts?: RequestOptions): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);
  const rid = makeRequestId();

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "GET",
        signal,
        headers: { Accept: "application/json", "x-request-id": rid },
      });

      const requestId = getServerRequestId(res, rid);

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (text && json === undefined) {
        return { ok: false, kind: "parse", status: res.status, error: `Invalid JSON from ${path}`, requestId };
      }

      if (!res.ok) {
        const serverMsg = extractServerErrorMessage(json);
        return json
          ? {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `GET ${path} failed (${res.status})`,
              json,
              requestId,
            }
          : {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `GET ${path} failed (${res.status})`,
              requestId,
            };
      }

      return { ok: true, status: res.status, json: json ?? ({} as JsonValue), requestId };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return {
      ok: false,
      kind: "network",
      status: 0,
      error: networkErrorMessage(e, url),
      requestId: rid,
    };
  }
};

export const apiGetJsonAuthed = async (
  path: string,
  idToken: string,
  opts?: RequestOptions
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);
  const rid = makeRequestId();

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "GET",
        signal,
        headers: {
          Accept: "application/json",
          "x-request-id": rid,
          Authorization: `Bearer ${idToken}`,
        },
      });

      const requestId = getServerRequestId(res, rid);

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (text && json === undefined) {
        return { ok: false, kind: "parse", status: res.status, error: `Invalid JSON from ${path}`, requestId };
      }

      if (!res.ok) {
        const serverMsg = extractServerErrorMessage(json);
        return json
          ? {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `GET ${path} failed (${res.status})`,
              json,
              requestId,
            }
          : {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `GET ${path} failed (${res.status})`,
              requestId,
            };
      }

      return { ok: true, status: res.status, json: json ?? ({} as JsonValue), requestId };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return {
      ok: false,
      kind: "network",
      status: 0,
      error: networkErrorMessage(e, url),
      requestId: rid,
    };
  }
};

export const apiPostJson = async (
  path: string,
  body: unknown,
  opts?: { timeoutMs?: number; headers?: Record<string, string> }
): Promise<ApiResult> => {
  const base = getBaseUrl();
  const url = joinUrl(base, path);
  const rid = makeRequestId();

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-request-id": rid,
          ...(opts?.headers ?? {}),
        },
        body: JSON.stringify(body),
      });

      const requestId = getServerRequestId(res, rid);

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (text && json === undefined) {
        return { ok: false, kind: "parse", status: res.status, error: `Invalid JSON from ${path}`, requestId };
      }

      if (!res.ok) {
        const serverMsg = extractServerErrorMessage(json);
        return json
          ? {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `POST ${path} failed (${res.status})`,
              json,
              requestId,
            }
          : {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `POST ${path} failed (${res.status})`,
              requestId,
            };
      }

      return { ok: true, status: res.status, json: json ?? ({} as JsonValue), requestId };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return { ok: false, kind: "network", status: 0, error: networkErrorMessage(e, url), requestId: rid };
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
  const rid = makeRequestId();

  const extraHeaders: Record<string, string> = {};
  if (opts?.idempotencyKey) extraHeaders["Idempotency-Key"] = opts.idempotencyKey;

  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-request-id": rid,
          Authorization: `Bearer ${idToken}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
      });

      const requestId = getServerRequestId(res, rid);

      const text = await res.text();
      const json = parseJsonSafely(text);

      if (text && json === undefined) {
        return { ok: false, kind: "parse", status: res.status, error: `Invalid JSON from ${path}`, requestId };
      }

      if (!res.ok) {
        const serverMsg = extractServerErrorMessage(json);

        return json
          ? {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `POST ${path} failed (${res.status})`,
              json,
              requestId,
            }
          : {
              ok: false,
              kind: "http",
              status: res.status,
              error: serverMsg ? String(serverMsg) : `POST ${path} failed (${res.status})`,
              requestId,
            };
      }

      return { ok: true, status: res.status, json: json ?? ({} as JsonValue), requestId };
    }, opts?.timeoutMs ?? 12000);
  } catch (e: unknown) {
    return { ok: false, kind: "network", status: 0, error: networkErrorMessage(e, url), requestId: rid };
  }
};
