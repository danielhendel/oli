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
import { apiGetJsonAuthed, apiPostJsonAuthed, apiPutJsonAuthed } from "@/lib/api/http";
import type { GetOptions, PostOptions, PutOptions } from "@/lib/api/http";
import type { z } from "zod";

function makeContractFailure(
  status: number,
  requestId: string | null,
  errorMessage: string,
  parsed: { error: { issues: { path: (string | number)[]; message: string }[] } },
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
    return makeContractFailure(res.status, res.requestId, "Invalid response shape", parsed) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
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
    return makeContractFailure(res.status, res.requestId, "Invalid response shape", parsed) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
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
    return makeContractFailure(res.status, res.requestId, "Invalid response shape", parsed) as ApiResult<T>;
  }

  return {
    ok: true,
    status: res.status,
    requestId: res.requestId,
    json: parsed.data,
  };
}
