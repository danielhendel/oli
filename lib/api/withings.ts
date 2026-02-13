/**
 * Phase 3A — Withings API client.
 * All calls use authed lib/api/http; no secrets in client.
 */
import type { ApiResult } from "@/lib/api/http";
import { apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import type { GetOptions } from "@/lib/api/http";
import { z } from "zod";

const withingsStatusResponseSchema = z.object({ ok: z.literal(true), connected: z.boolean() });
export type WithingsStatusResponse = z.infer<typeof withingsStatusResponseSchema>;

const withingsConnectResponseSchema = z.object({ ok: z.literal(true), url: z.string().url() });
const withingsPullResponseSchema = z.object({
  ok: z.literal(true),
  written: z.number(),
  cursor: z.number(),
});

export type WithingsPullResponse = z.infer<typeof withingsPullResponseSchema>;

function truthGetOpts(opts?: GetOptions) {
  return { noStore: true as const, ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}) };
}

/** GET /integrations/withings/status — connected flag, no tokens. */
export async function getWithingsStatus(
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<WithingsStatusResponse>> {
  return apiGetZodAuthed("/integrations/withings/status", idToken, withingsStatusResponseSchema, truthGetOpts(opts));
}

/** POST /integrations/withings/connect — returns OAuth URL for client to open. */
export async function getWithingsConnectUrl(
  idToken: string,
): Promise<ApiResult<{ authorizationUrl: string }>> {
  const res = await apiPostZodAuthed(
    "/integrations/withings/connect",
    {},
    idToken,
    withingsConnectResponseSchema,
    { noStore: true },
  );
  if (!res.ok) return res;
  return { ok: true, status: res.status, requestId: res.requestId, json: { authorizationUrl: res.json.url } };
}

/** POST /integrations/withings/pull — admin/dev: pull new measures; requires Idempotency-Key. */
export async function pullWithings(
  idToken: string,
  idempotencyKey: string,
  body: { timeZone: string; cursor?: number },
): Promise<ApiResult<WithingsPullResponse>> {
  return apiPostZodAuthed(
    "/integrations/withings/pull",
    body,
    idToken,
    withingsPullResponseSchema,
    { idempotencyKey, noStore: true },
  );
}
