/**
 * POST /integrations/oura/sleep-day-refresh — Oura sync + server recompute for a day (Sleep latest-day refresh).
 */

import type { ApiResult } from "@/lib/api/http";
import type { PostOptions } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import { z } from "zod";

const ouraSleepDayRefreshResponseSchema = z.object({
  ok: z.literal(true),
  requestId: z.string(),
  day: z.string(),
  pullNowStatus: z.number(),
});

export type OuraSleepDayRefreshResponse = z.infer<typeof ouraSleepDayRefreshResponseSchema>;

export async function postOuraSleepDayRefresh(
  idToken: string,
  body: { day: string },
  opts?: PostOptions,
): Promise<ApiResult<OuraSleepDayRefreshResponse>> {
  return apiPostZodAuthed(
    "/integrations/oura/sleep-day-refresh",
    body,
    idToken,
    ouraSleepDayRefreshResponseSchema,
    {
      timeoutMs: 120_000,
      noStore: true,
      ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
      ...(opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
    },
  );
}
