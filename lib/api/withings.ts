/**
 * Phase 3A — Withings API client.
 * All calls use authed lib/api/http; no secrets in client.
 */
import type { ApiResult } from "@/lib/api/http";
import { apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import type { GetOptions, PostOptions } from "@/lib/api/http";
import { z } from "zod";

const withingsStatusResponseSchema = z.object({
  ok: z.literal(true),
  connected: z.boolean(),
  scopes: z.array(z.string()),
  connectedAt: z.string().nullable(),
  revoked: z.boolean(),
  failureState: z.record(z.unknown()).nullable(),
});
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

/** GET /integrations/withings/connect — returns OAuth URL for client to open. Requires Authorization. */
export async function getWithingsConnectUrl(
  idToken: string,
): Promise<ApiResult<{ url: string }>> {
  const res = await apiGetZodAuthed(
    "/integrations/withings/connect",
    idToken,
    withingsConnectResponseSchema,
    truthGetOpts(),
  );
  if (!res.ok) return res;
  return { ok: true, status: res.status, requestId: res.requestId, json: { url: res.json.url } };
}

/** Callback URL for Withings OAuth (must match backend WITHINGS_REDIRECT_URI). */
export function getWithingsRedirectUri(): string {
  const base = process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "";
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized}/integrations/withings/callback`;
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

// ----------------------------
// W4B — POST /integrations/withings/pull-now (user-initiated, gateway)
// ----------------------------

export type WithingsPullNowResponse = {
  ok: true;
  requestId: string;
  windowHours: number;
  eventsCreated: number;
  eventsAlreadyExists: number;
  failuresWritten: number;
  failureWriteErrors: number;
};

const withingsPullNowDtoSchema = z.object({
  ok: z.literal(true),
  requestId: z.string(),
  windowHours: z.number(),
  eventsCreated: z.number(),
  eventsAlreadyExists: z.number(),
  failuresWritten: z.number(),
  failureWriteErrors: z.number(),
});

/** POST /integrations/withings/pull-now — pull last 72h for authed user; requires Idempotency-Key. */
export async function postWithingsPullNow(
  idToken: string,
  opts?: PostOptions,
): Promise<ApiResult<WithingsPullNowResponse>> {
  return apiPostZodAuthed(
    "/integrations/withings/pull-now",
    {},
    idToken,
    withingsPullNowDtoSchema,
    {
      timeoutMs: 20000,
      noStore: true,
      ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
      ...(opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
    },
  );
}
