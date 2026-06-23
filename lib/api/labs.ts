// lib/api/labs.ts
import type { ApiResult } from "@/lib/api/http";
import type { GetOptions, PostOptions } from "@/lib/api/http";
import { apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import {
  createLabUploadResponseDtoSchema,
  labMetricDetailResponseDtoSchema,
  labUploadDetailResponseDtoSchema,
  labUploadsListResponseDtoSchema,
  labsSummaryResponseDtoSchema,
  type CreateLabUploadRequestDto,
  type CreateLabUploadResponseDto,
  type LabMetricDetailResponseDto,
  type LabUploadDetailResponseDto,
  type LabUploadsListResponseDto,
  type LabsSummaryResponseDto,
} from "@/lib/contracts";

export const getLabsSummary = async (
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<LabsSummaryResponseDto>> => {
  return apiGetZodAuthed("/users/me/labs/summary", idToken, labsSummaryResponseDtoSchema, opts);
};

export const getLabUploads = async (
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<LabUploadsListResponseDto>> => {
  return apiGetZodAuthed("/users/me/labs/uploads", idToken, labUploadsListResponseDtoSchema, opts);
};

export const createLabUpload = async (
  idToken: string,
  body: CreateLabUploadRequestDto,
  opts?: PostOptions,
): Promise<ApiResult<CreateLabUploadResponseDto>> => {
  return apiPostZodAuthed("/users/me/labs/uploads", body, idToken, createLabUploadResponseDtoSchema, opts);
};

export const getLabUploadDetail = async (
  idToken: string,
  uploadId: string,
  opts?: GetOptions,
): Promise<ApiResult<LabUploadDetailResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/labs/uploads/${encodeURIComponent(uploadId)}`,
    idToken,
    labUploadDetailResponseDtoSchema,
    opts,
  );
};

export const getLabMetricDetail = async (
  idToken: string,
  metricKey: string,
  opts?: GetOptions,
): Promise<ApiResult<LabMetricDetailResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/labs/metrics/${encodeURIComponent(metricKey)}`,
    idToken,
    labMetricDetailResponseDtoSchema,
    opts,
  );
};
