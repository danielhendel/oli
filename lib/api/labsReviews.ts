// lib/api/labsReviews.ts
import type { ApiResult } from "@/lib/api/http";
import type { GetOptions, PatchOptions, PostOptions } from "@/lib/api/http";
import { apiGetZodAuthed, apiPatchZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import {
  acceptLabReviewResponseSchema,
  labReviewDetailDtoSchema,
  labReviewsListResponseDtoSchema,
  patchLabReviewCandidateResponseSchema,
  rejectLabReviewResponseSchema,
  type AcceptLabReviewRequest,
  type LabReviewDetailDto,
  type LabReviewsListResponseDto,
  type PatchLabReviewCandidateRequest,
  type RejectLabReviewRequest,
} from "@/lib/contracts";

export const getLabReviews = async (
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<LabReviewsListResponseDto>> => {
  return apiGetZodAuthed("/users/me/labs/reviews", idToken, labReviewsListResponseDtoSchema, opts);
};

export const getLabReviewDetail = async (
  idToken: string,
  documentId: string,
  opts?: GetOptions,
): Promise<ApiResult<LabReviewDetailDto>> => {
  return apiGetZodAuthed(
    `/users/me/labs/reviews/${encodeURIComponent(documentId)}`,
    idToken,
    labReviewDetailDtoSchema,
    opts,
  );
};

export const patchLabReviewCandidate = async (
  idToken: string,
  documentId: string,
  candidateId: string,
  body: PatchLabReviewCandidateRequest,
  opts?: PatchOptions,
): Promise<ApiResult<{ ok: true; reviewVersion: number }>> => {
  return apiPatchZodAuthed(
    `/users/me/labs/reviews/${encodeURIComponent(documentId)}/candidates/${encodeURIComponent(candidateId)}`,
    body,
    idToken,
    patchLabReviewCandidateResponseSchema,
    opts,
  );
};

export const acceptLabReview = async (
  idToken: string,
  documentId: string,
  body: AcceptLabReviewRequest,
  opts?: PostOptions,
): Promise<
  ApiResult<{
    ok: true;
    acceptedCount: number;
    acceptedIds: string[];
    unresolvedCount: number;
    reviewVersion: number;
  }>
> => {
  return apiPostZodAuthed(
    `/users/me/labs/reviews/${encodeURIComponent(documentId)}/accept`,
    body,
    idToken,
    acceptLabReviewResponseSchema,
    opts,
  );
};

export const rejectLabReviewCandidates = async (
  idToken: string,
  documentId: string,
  body: RejectLabReviewRequest,
  opts?: PostOptions,
): Promise<ApiResult<{ ok: true; reviewVersion: number }>> => {
  return apiPostZodAuthed(
    `/users/me/labs/reviews/${encodeURIComponent(documentId)}/reject`,
    body,
    idToken,
    rejectLabReviewResponseSchema,
    opts,
  );
};
