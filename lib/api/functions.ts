// lib/api/functions.ts
import { apiPostJsonAuthed, type ApiResult } from "./http";

/**
 * Calls a backend function-like endpoint via the Cloud Run API boundary.
 * Returns ApiResult so requestId/kind are always present.
 */
export const callFunctionJson = async (
  functionName: string,
  body: unknown,
  idToken: string,
  opts?: { timeoutMs?: number; idempotencyKey?: string }
): Promise<ApiResult> => {
  const path = `/functions/${encodeURIComponent(functionName)}`;

  const postOpts =
    opts && (opts.timeoutMs !== undefined || opts.idempotencyKey !== undefined)
      ? {
          ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
          ...(opts.idempotencyKey !== undefined ? { idempotencyKey: opts.idempotencyKey } : {}),
        }
      : undefined;

  return apiPostJsonAuthed(path, body, idToken, postOpts);
};

/**
 * Back-compat export expected by older debug tooling.
 * If you still use admin-only callable routes later, keep this wrapper.
 */
export const callAdminFunction = async (
  functionName: string,
  body: unknown,
  idToken: string,
  opts?: { timeoutMs?: number; idempotencyKey?: string }
): Promise<ApiResult> => callFunctionJson(functionName, body, idToken, opts);
