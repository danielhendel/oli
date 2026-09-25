// lib/api/bodyScans.ts
import type { ApiResult, DeleteOptions, GetOptions, PostOptions } from "@/lib/api/http";
import { apiDeleteZodAuthed, apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import {
  bodyScanConfirmRequestDtoSchema,
  bodyScanConfirmResponseDtoSchema,
  bodyScanDeleteResponseDtoSchema,
  bodyScanDetailResponseDtoSchema,
  bodyScanReprocessResponseDtoSchema,
  bodyScanReviewResponseDtoSchema,
  bodyScansListResponseDtoSchema,
  type BodyScanConfirmRequestDto,
  type BodyScanConfirmResponseDto,
  type BodyScanDeleteResponseDto,
  type BodyScanDetailResponseDto,
  type BodyScanReprocessResponseDto,
  type BodyScanReviewResponseDto,
  type BodyScansListResponseDto,
} from "@/lib/contracts";

export const getBodyScans = async (
  idToken: string,
  opts?: GetOptions & { limit?: number },
): Promise<ApiResult<BodyScansListResponseDto>> => {
  const path = opts?.limit != null ? `/users/me/body-scans?limit=${opts.limit}` : "/users/me/body-scans";
  return apiGetZodAuthed(path, idToken, bodyScansListResponseDtoSchema, opts);
};

export const getBodyScanDetail = async (
  idToken: string,
  scanId: string,
  opts?: GetOptions,
): Promise<ApiResult<BodyScanDetailResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/body-scans/${encodeURIComponent(scanId)}`,
    idToken,
    bodyScanDetailResponseDtoSchema,
    opts,
  );
};

export const getBodyScanReview = async (
  idToken: string,
  scanId: string,
  opts?: GetOptions,
): Promise<ApiResult<BodyScanReviewResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/body-scans/${encodeURIComponent(scanId)}/review`,
    idToken,
    bodyScanReviewResponseDtoSchema,
    opts,
  );
};

export const confirmBodyScan = async (
  idToken: string,
  scanId: string,
  body: BodyScanConfirmRequestDto,
  opts?: PostOptions,
): Promise<ApiResult<BodyScanConfirmResponseDto>> => {
  const parsed = bodyScanConfirmRequestDtoSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 0, kind: "contract", error: "Invalid confirm body", requestId: null };
  }
  return apiPostZodAuthed(
    `/users/me/body-scans/${encodeURIComponent(scanId)}/confirm`,
    parsed.data,
    idToken,
    bodyScanConfirmResponseDtoSchema,
    opts,
  );
};

export const reprocessBodyScan = async (
  idToken: string,
  scanId: string,
  opts?: PostOptions,
): Promise<ApiResult<BodyScanReprocessResponseDto>> => {
  return apiPostZodAuthed(
    `/users/me/body-scans/${encodeURIComponent(scanId)}/reprocess`,
    {},
    idToken,
    bodyScanReprocessResponseDtoSchema,
    opts,
  );
};

export const deleteBodyScan = async (
  idToken: string,
  scanId: string,
  opts?: DeleteOptions,
): Promise<ApiResult<BodyScanDeleteResponseDto>> => {
  return apiDeleteZodAuthed(
    `/users/me/body-scans/${encodeURIComponent(scanId)}`,
    idToken,
    bodyScanDeleteResponseDtoSchema,
    opts,
  );
};
