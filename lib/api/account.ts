// lib/api/account.ts
import type { ApiResult } from "./http";
import { apiPostJsonAuthed } from "./http";

export type AccountDeleteQueued = {
  ok: true;
  status: "queued";
  requestId: string;
};

// Keep permissive; gateway errors may be structured.
export type AccountDeleteResponse = AccountDeleteQueued | { ok: false; error: unknown };

export async function requestAccountDelete(
  idToken: string,
  requestId: string,
): Promise<ApiResult<AccountDeleteResponse>> {
  // Route requires x-request-id for correlation/idempotency.
  return apiPostJsonAuthed<AccountDeleteResponse>("/account/delete", {}, idToken, {
    timeoutMs: 15000,
    noStore: true,
    requestId,
  });
}
