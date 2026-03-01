/**
 * Apple Health — client API for GET /integrations/apple-health/status (server truth).
 * All calls use lib/api/http; no secrets in client or logs.
 */

import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { apiGetZodAuthed } from "@/lib/api/validate";
import { z } from "zod";

const appleHealthStatusResponseSchema = z.object({
  ok: z.literal(true),
  requestId: z.string(),
  connected: z.boolean(),
  lastSyncAt: z.string().nullable(),
});

export type AppleHealthStatusResponse = z.infer<typeof appleHealthStatusResponseSchema>;

function truthGetOpts(opts?: GetOptions): GetOptions {
  return { noStore: true as const, ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}) };
}

/** GET /integrations/apple-health/status — connected and lastSyncAt from server (rawEvents). */
export async function getAppleHealthStatus(
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<AppleHealthStatusResponse>> {
  return apiGetZodAuthed(
    "/integrations/apple-health/status",
    idToken,
    appleHealthStatusResponseSchema,
    truthGetOpts(opts),
  );
}
