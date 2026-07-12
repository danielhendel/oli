/**
 * GET /users/me/oura-stress — bounded Oura Daily Stress vendor snapshot range.
 */

/** Must match services/api mount + infra/gateway/openapi.yaml path exactly. */
export const OURA_STRESS_RANGE_API_PATH = "/users/me/oura-stress";

import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { apiGetZodAuthed } from "@/lib/api/validate";
import {
  ouraStressRangeResponseDtoSchema,
  type OuraStressRangeResponseDto,
} from "@oli/contracts/ouraVendor";

/**
 * Bounded range read of exact provider Daily Stress days (missing days omitted; max 90 inclusive).
 * `signal` is accepted for callers; the shared HTTP client currently uses an internal timeout abort.
 */
export async function getOuraStressRange(
  idToken: string,
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<ApiResult<OuraStressRangeResponseDto>> {
  void signal;
  const q = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const opts: GetOptions = { noStore: true };
  return apiGetZodAuthed(
    `${OURA_STRESS_RANGE_API_PATH}?${q}`,
    idToken,
    ouraStressRangeResponseDtoSchema,
    opts,
  );
}
