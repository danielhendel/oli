import type { ApiResult, GetOptions } from "@/lib/api/http";
import { apiGetZodAuthed } from "@/lib/api/validate";
import { labAnalyteHistoryDtoSchema, type LabAnalyteHistoryDto } from "@/lib/contracts";

/** Bounded accepted-result history for a canonical metric (collectedAt descending). */
export async function getLabMetricHistory(
  idToken: string,
  metricKey: string,
  opts?: GetOptions & { limit?: number; cursor?: string | null },
): Promise<ApiResult<LabAnalyteHistoryDto>> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  return apiGetZodAuthed(
    `/users/me/labs/metrics/${encodeURIComponent(metricKey)}/history${qs ? `?${qs}` : ""}`,
    idToken,
    labAnalyteHistoryDtoSchema,
    opts,
  );
}
