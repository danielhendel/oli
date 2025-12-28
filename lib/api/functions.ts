// lib/api/functions.ts
import type { ApiResult } from "./http";
import { apiPostJsonAuthed } from "./http";

export type CallFunctionOptions = {
  idempotencyKey?: string;
  timeoutMs?: number;
};

export const callFunctionJson = async <TRes = unknown>(
  functionName: string,
  body: unknown,
  idToken: string,
  opts?: CallFunctionOptions,
): Promise<ApiResult<TRes>> => {
  const path = `/functions/${encodeURIComponent(functionName)}`;
  return apiPostJsonAuthed<TRes>(path, body, idToken, opts);
};

/**
 * Admin function wrapper (kept for debug tooling compatibility).
 * Uses the same backend routing; admin auth is enforced server-side.
 */
export const callAdminFunction = async <TRes = unknown>(
  functionName: string,
  body: unknown,
  idToken: string,
  opts?: CallFunctionOptions,
): Promise<ApiResult<TRes>> => {
  const path = `/admin/functions/${encodeURIComponent(functionName)}`;
  return apiPostJsonAuthed<TRes>(path, body, idToken, opts);
};
