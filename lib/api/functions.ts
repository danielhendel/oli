// lib/api/functions.ts
/**
 * Sprint 2 — Generic function caller.
 * RATIONALE: callFunctionAuthed is a generic HTTP trigger for arbitrary Cloud Functions.
 * No fixed DTO schema exists; responses are caller-typed (T = JsonValue by default).
 * Client callers that need structured responses MUST validate at the call site with their own schema.
 */
import type { ApiResult, JsonValue } from "./http";
import { apiPostJsonAuthed } from "./http";

type CallFunctionOk<T> = { ok: true; data: T };
type CallFunctionFail = { ok: false; error: string };

export async function callFunctionAuthed<T = JsonValue>(
  name: string,
  body: unknown,
  idToken: string,
): Promise<ApiResult<CallFunctionOk<T> | CallFunctionFail>> {
  return apiPostJsonAuthed(`/functions/${encodeURIComponent(name)}`, body, idToken, { timeoutMs: 15000 });
}

// ✅ Back-compat for older debug tooling
export async function callAdminFunction<T = JsonValue>(
  name: string,
  body: unknown,
  idToken: string,
): Promise<ApiResult<CallFunctionOk<T> | CallFunctionFail>> {
  // If you later split admin endpoints, change ONLY this path.
  return apiPostJsonAuthed(`/functions/${encodeURIComponent(name)}`, body, idToken, { timeoutMs: 15000 });
}
