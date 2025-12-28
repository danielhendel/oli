// lib/api/http.ts
import { getEnv } from "@/lib/env";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

export type FailureKind = "NETWORK" | "HTTP" | "PARSE" | "UNKNOWN";

export type ApiOk<T = JsonValue> = {
  ok: true;
  status: number;
  requestId: string | null;
  json: T;
};

export type ApiFailure = {
  ok: false;
  kind: FailureKind;
  status: number;
  requestId: string | null;
  error: string;
  json?: JsonValue;
};

export type ApiResult<T = JsonValue> = ApiOk<T> | ApiFailure;

type PostOptions = {
  idempotencyKey?: string;
  timeoutMs?: number;
};

const baseUrl = (): string => getEnv().EXPO_PUBLIC_BACKEND_BASE_URL.replace(/\/+$/, "");
const readRequestId = (res: Response): string | null => res.headers.get("x-request-id");

const stringifyError = (status: number, json: JsonValue | undefined): string => {
  if (typeof json === "string") return json;
  if (json && typeof json === "object") {
    const maybe = (json as Record<string, unknown>)["error"];
    if (typeof maybe === "string") return maybe;
    try {
      return JSON.stringify(json);
    } catch {
      // ignore
    }
  }
  return `HTTP ${status}`;
};

const withTimeout = async <T>(p: Promise<T>, timeoutMs: number): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        t = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
};

const safeJson = async (res: Response): Promise<JsonValue | undefined> => {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return text as JsonValue;
  }
};

const failure = (
  kind: FailureKind,
  status: number,
  requestId: string | null,
  error: string,
  json?: JsonValue,
): ApiFailure => (json !== undefined ? { ok: false, kind, status, requestId, error, json } : { ok: false, kind, status, requestId, error });

/**
 * GET JSON (no auth) — used for /health, etc.
 */
export const apiGetJson = async <T = JsonValue>(path: string, timeoutMs = 15000): Promise<ApiResult<T>> => {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      }),
      timeoutMs,
    );

    const requestId = readRequestId(res);
    const json = await safeJson(res);

    if (!res.ok) return failure("HTTP", res.status, requestId, stringifyError(res.status, json), json);
    return { ok: true, status: res.status, requestId, json: json as unknown as T };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return failure("NETWORK", 0, null, msg);
  }
};

/**
 * GET JSON (authed)
 */
export const apiGetJsonAuthed = async <T = JsonValue>(
  path: string,
  idToken: string,
  timeoutMs = 15000,
): Promise<ApiResult<T>> => {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          Accept: "application/json",
        },
      }),
      timeoutMs,
    );

    const requestId = readRequestId(res);
    const json = await safeJson(res);

    if (!res.ok) return failure("HTTP", res.status, requestId, stringifyError(res.status, json), json);
    return { ok: true, status: res.status, requestId, json: json as unknown as T };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return failure("NETWORK", 0, null, msg);
  }
};

/**
 * POST JSON (authed)
 */
export const apiPostJsonAuthed = async <TRes = JsonValue>(
  path: string,
  body: unknown,
  idToken: string,
  opts?: PostOptions,
): Promise<ApiResult<TRes>> => {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  try {
    const res = await withTimeout(
      fetch(url, { method: "POST", headers, body: JSON.stringify(body) }),
      opts?.timeoutMs ?? 15000,
    );

    const requestId = readRequestId(res);
    const json = await safeJson(res);

    if (!res.ok) return failure("HTTP", res.status, requestId, stringifyError(res.status, json), json);
    return { ok: true, status: res.status, requestId, json: json as unknown as TRes };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return failure("NETWORK", 0, null, msg);
  }
};
