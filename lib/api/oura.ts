/**
 * Oura — client API for status, connect URL, and revoke.
 * Status is from integration record (users/{uid}/integrations/oura).
 */

import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import { z } from "zod";

const ouraStatusResponseSchema = z.object({
  ok: z.literal(true),
  requestId: z.string(),
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
  revoked: z.boolean().optional(),
  failureState: z.record(z.unknown()).nullable().optional(),
});

const ouraConnectResponseSchema = z.object({
  ok: z.literal(true),
  url: z.string().url(),
});

const ouraRevokeResponseSchema = z.object({
  ok: z.literal(true),
});

export type OuraStatusResponse = z.infer<typeof ouraStatusResponseSchema>;

function truthGetOpts(opts?: GetOptions): GetOptions {
  return { noStore: true as const, ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}) };
}

/** GET /integrations/oura/status — connected and lastSyncAt from integration record. */
export async function getOuraStatus(
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<OuraStatusResponse>> {
  return apiGetZodAuthed(
    "/integrations/oura/status",
    idToken,
    ouraStatusResponseSchema,
    truthGetOpts(opts),
  );
}

/** GET /integrations/oura/connect — returns OAuth URL for client to open. */
export async function getOuraConnectUrl(
  idToken: string,
): Promise<ApiResult<{ url: string }>> {
  const res = await apiGetZodAuthed(
    "/integrations/oura/connect",
    idToken,
    ouraConnectResponseSchema,
    truthGetOpts(),
  );
  if (!res.ok) return res;
  return { ok: true, status: res.status, requestId: res.requestId, json: { url: res.json.url } };
}

/** POST /integrations/oura/revoke — disconnect Oura. */
export async function postOuraRevoke(idToken: string): Promise<ApiResult<{ ok: true }>> {
  return apiPostZodAuthed(
    "/integrations/oura/revoke",
    {},
    idToken,
    ouraRevokeResponseSchema,
    { noStore: true },
  );
}
