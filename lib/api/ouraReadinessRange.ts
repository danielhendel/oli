/**
 * GET /users/me/oura-readiness-range — bounded Oura Daily Readiness vendor snapshot range.
 *
 * Response includes overall score plus approved contributor scores when present.
 * One bounded request serves HRV Balance, Body Temperature, Recovery Index, and
 * Sleep Balance history (Phase 2F-C1).
 */

/** Must match services/api mount + infra/gateway/openapi.yaml path exactly. */
export const OURA_READINESS_RANGE_API_PATH = "/users/me/oura-readiness-range";

import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { apiGetZodAuthed } from "@/lib/api/validate";
import {
  ouraReadinessRangeResponseDtoSchema,
  type OuraReadinessRangeResponseDto,
} from "@oli/contracts/ouraVendor";

export type GetOuraReadinessRangeOptions = {
  signal?: AbortSignal;
  cacheBust?: string;
};

/**
 * Bounded range read of exact provider Readiness days (missing days omitted; max 90 inclusive).
 * No fallback densification — only days present in vendor snapshots are returned.
 */
export async function getOuraReadinessRange(
  idToken: string,
  start: string,
  end: string,
  opts?: GetOuraReadinessRangeOptions,
): Promise<ApiResult<OuraReadinessRangeResponseDto>> {
  void opts?.signal;
  const q = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const getOpts: GetOptions = {
    noStore: true,
    ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
  };
  return apiGetZodAuthed(
    `${OURA_READINESS_RANGE_API_PATH}?${q}`,
    idToken,
    ouraReadinessRangeResponseDtoSchema,
    getOpts,
  );
}
