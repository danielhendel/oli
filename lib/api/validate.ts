// lib/api/validate.ts
/**
 * Sprint 2 — Client Trust Layer: Runtime validation at the server truth boundary.
 *
 * All API functions returning typed DTOs MUST use these helpers.
 * - res.ok === false: returned unchanged (preserve http/network behavior)
 * - res.ok === true: schema.safeParse(res.json)
 *   - success: return ApiOk with parsed data
 *   - failure: return ApiFailure kind="contract" (fail-closed, never cast)
 */
import type { ApiFailure, ApiResult, JsonValue } from "@/lib/api/http";
import { apiDeleteJsonAuthed, apiGetJsonAuthed, apiPostJsonAuthed, apiPutJsonAuthed } from "@/lib/api/http";
import type { DeleteOptions, GetOptions, PostOptions, PutOptions } from "@/lib/api/http";
import type { z } from "zod";

function makeContractFailure(
  status: number,
  requestId: string | null,
  errorMessage: string,
  parsed: { error: { issues: { path: (string | number)[]; message: string }[] } },
  meta?: { responseContentType?: string | null },
): ApiFailure {
  const json: JsonValue = {
    issues: parsed.error.issues.map((i) => ({
      path: i.path.map(String),
      message: i.message,
    })),
  };
  return {
    ok: false,
    status,
    kind: "contract",
    error: errorMessage,
    requestId,
    json,
    ...(meta?.responseContentType !== undefined ? { responseContentType: meta.responseContentType } : {}),
  };
}

export async function apiGetZodAuthed<T>(
  path: string,
  idToken: string,
  schema: z.ZodType<T>,
  opts?: GetOptions,
): Promise<ApiResult<T>> {
  const res = await apiGetJsonAuthed<unknown>(path, idToken, opts);

  if (!res.ok) return res as ApiResult<T>;

  const parsed = schema.safeParse(res.json);
  if (!parsed.success) {
    return makeContractFailure(
      res.status,
      res.requestId,
      "Invalid response shape",
      parsed,
      res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined,
    ) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
    ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : {}),
  };
}

/**
 * Like apiGetZodAuthed, but HTTP 404 is treated as “resource not created yet” and returns
 * `notFoundValue` with ok:true (no error surface). Other failures are unchanged.
 */
export async function apiGetZodAuthedDefaultOn404<T>(
  path: string,
  idToken: string,
  schema: z.ZodType<T>,
  notFoundValue: T,
  opts?: GetOptions,
): Promise<ApiResult<T>> {
  const res = await apiGetJsonAuthed<unknown>(path, idToken, opts);

  if (!res.ok && res.status === 404) {
    return {
      ok: true,
      status: 200,
      requestId: res.requestId,
      json: notFoundValue,
    };
  }

  if (!res.ok) return res as ApiResult<T>;

  const parsed = schema.safeParse(res.json);
  if (!parsed.success) {
    return makeContractFailure(
      res.status,
      res.requestId,
      "Invalid response shape",
      parsed,
      res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined,
    ) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
    ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : {}),
  };
}

export async function apiPostZodAuthed<T>(
  path: string,
  body: unknown,
  idToken: string,
  schema: z.ZodType<T>,
  opts?: PostOptions,
): Promise<ApiResult<T>> {
  const res = await apiPostJsonAuthed<unknown>(path, body, idToken, opts);

  if (!res.ok) return res as ApiResult<T>;

  const parsed = schema.safeParse(res.json);
  if (!parsed.success) {
    return makeContractFailure(
      res.status,
      res.requestId,
      "Invalid response shape",
      parsed,
      res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined,
    ) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
    ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : {}),
  };
}

export async function apiPutZodAuthed<T>(
  path: string,
  body: unknown,
  idToken: string,
  schema: z.ZodType<T>,
  opts?: PutOptions,
): Promise<ApiResult<T>> {
  const res = await apiPutJsonAuthed<unknown>(path, body, idToken, opts);

  if (!res.ok) return res as ApiResult<T>;

  const parsed = schema.safeParse(res.json);
  if (!parsed.success) {
    return makeContractFailure(
      res.status,
      res.requestId,
      "Invalid response shape",
      parsed,
      res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined,
    ) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
    ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : {}),
  };
}

export async function apiDeleteZodAuthed<T>(
  path: string,
  idToken: string,
  schema: z.ZodType<T>,
  opts?: DeleteOptions,
): Promise<ApiResult<T>> {
  const res = await apiDeleteJsonAuthed<unknown>(path, idToken, opts);

  if (!res.ok) return res as ApiResult<T>;

  const parsed = schema.safeParse(res.json);
  if (!parsed.success) {
    return makeContractFailure(
      res.status,
      res.requestId,
      "Invalid response shape",
      parsed,
      res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : undefined,
    ) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
    ...(res.responseContentType !== undefined ? { responseContentType: res.responseContentType } : {}),
  };
}
