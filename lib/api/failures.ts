// lib/api/failures.ts
import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { apiGetZodAuthed } from "@/lib/api/validate";
import {
  failureListResponseDtoSchema,
  type FailureListResponseDto,
} from "@/lib/contracts/failure";

export async function getFailures(
  day: string,
  idToken: string,
  opts?: { limit?: number; cursor?: string } & GetOptions,
): Promise<ApiResult<FailureListResponseDto>> {
  const params = new URLSearchParams({ day });
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  return apiGetZodAuthed(
    `/users/me/failures?${params.toString()}`,
    idToken,
    failureListResponseDtoSchema,
    {
      noStore: true,
      ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
      ...(opts?.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    },
  );
}

export async function getFailuresRange(
  args: { start: string; end: string; limit?: number; cursor?: string },
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<FailureListResponseDto>> {
  const params = new URLSearchParams({ start: args.start, end: args.end });
  if (typeof args.limit === "number") params.set("limit", String(args.limit));
  if (args.cursor) params.set("cursor", args.cursor);

  return apiGetZodAuthed(
    `/users/me/failures/range?${params.toString()}`,
    idToken,
    failureListResponseDtoSchema,
    {
      noStore: true,
      ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
      ...(opts?.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    },
  );
}
