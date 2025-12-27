// lib/api/http.ts
import { getFirebaseAuth } from "@/lib/firebaseConfig";

export type FailureKind = "http" | "auth" | "network" | "timeout" | "parse" | "unknown";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export type ApiSuccess<T = JsonValue> = {
  ok: true;
  status: number;
  json: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  status: number;
  error: string;
  kind: FailureKind;
  json: JsonValue | null;
  requestId: string;
};

export type ApiResult<T = JsonValue> = ApiSuccess<T> | ApiFailure;

export type PostOpts = {
  timeoutMs?: number;
  idempotencyKey?: string;
};

const DEFAULT_TIMEOUT_MS = 20_000;

const getBackendBaseUrl = (): string => {
  const v = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (!v) throw new Error("Missing EXPO_PUBLIC_BACKEND_BASE_URL");
  return v.replace(/\/$/, "");
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error("timeout")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
};

const getIdTokenOrThrow = async (): Promise<string> => {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("unauthorized");
  return user.getIdToken(false);
};

const readRequestId = (res: Response): string => {
  return (
    res.headers.get("x-request-id") ??
    res.headers.get("x-requestid") ??
    res.headers.get("x-oli-request-id") ??
    "unknown"
  );
};

const toFailure = (args: {
  status: number;
  error: string;
  kind: FailureKind;
  json: JsonValue | null;
  requestId: string;
}): ApiFailure => {
  return {
    ok: false,
    status: args.status,
    error: args.error,
    kind: args.kind,
    json: args.json,
    requestId: args.requestId,
  };
};

const coerceJsonValue = (v: unknown): JsonValue | null => {
  try {
    return JSON.parse(JSON.stringify(v)) as JsonValue;
  } catch {
    return null;
  }
};

type CoreRequestOpts = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  timeoutMs?: number;
  token?: string;
  anonymous?: boolean;
  idempotencyKey?: string;
};

const requestJson = async <T>(opts: CoreRequestOpts): Promise<ApiResult<T>> => {
  const base = getBackendBaseUrl();
  const url = `${base}${opts.path.startsWith("/") ? "" : "/"}${opts.path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  if (!opts.anonymous) {
    try {
      const token = opts.token ?? (await getIdTokenOrThrow());
      headers.Authorization = `Bearer ${token}`;
    } catch {
      return toFailure({ status: 401, error: "Unauthorized", kind: "auth", json: null, requestId: "unknown" });
    }
  }

  // ✅ Avoid referencing RequestInit (eslint no-undef in non-DOM env)
  const init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  } = { method: opts.method, headers };

  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let res: Response;
  try {
    res = await withTimeout(fetch(url, init), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  } catch (e) {
    const isTimeout = e instanceof Error && e.message === "timeout";
    return toFailure({
      status: isTimeout ? 408 : 0,
      error: isTimeout ? "Request timed out" : "Network error",
      kind: isTimeout ? "timeout" : "network",
      json: null,
      requestId: "unknown",
    });
  }

  const requestId = readRequestId(res);

  const text = await res.text();
  let parsedUnknown: unknown = null;
  if (text.length) {
    try {
      parsedUnknown = JSON.parse(text);
    } catch {
      parsedUnknown = { message: text };
    }
  }

  const parsedJson = coerceJsonValue(parsedUnknown);

  if (!res.ok) {
    const status = res.status;
    const kind: FailureKind = status === 401 ? "auth" : "http";
    const error = status === 401 ? "Unauthorized" : `HTTP ${status}`;
    return toFailure({ status, error, kind, json: parsedJson, requestId });
  }

  return { ok: true, status: res.status, json: parsedUnknown as T, requestId };
};

export const apiGetJson = async <T = JsonValue>(path: string, timeoutMs?: number): Promise<ApiResult<T>> => {
  const opts: CoreRequestOpts = { method: "GET", path, anonymous: true };
  if (timeoutMs !== undefined) opts.timeoutMs = timeoutMs;
  return requestJson<T>(opts);
};

export const apiGetJsonAuthed = async <T = JsonValue>(
  path: string,
  idToken?: string,
  timeoutMs?: number,
): Promise<ApiResult<T>> => {
  const opts: CoreRequestOpts = { method: "GET", path, anonymous: false };
  if (idToken) opts.token = idToken;
  if (timeoutMs !== undefined) opts.timeoutMs = timeoutMs;
  return requestJson<T>(opts);
};

export const apiPostJsonAuthed = async <T = JsonValue>(
  path: string,
  body: unknown,
  idToken?: string,
  postOpts?: PostOpts,
): Promise<ApiResult<T>> => {
  const opts: CoreRequestOpts = { method: "POST", path, body, anonymous: false };
  if (idToken) opts.token = idToken;
  if (postOpts?.timeoutMs !== undefined) opts.timeoutMs = postOpts.timeoutMs;
  if (postOpts?.idempotencyKey) opts.idempotencyKey = postOpts.idempotencyKey;
  return requestJson<T>(opts);
};
