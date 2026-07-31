// lib/api/documents.ts
import type { ApiResult, DeleteOptions, GetOptions, PostOptions } from "@/lib/api/http";
import { apiDeleteZodAuthed, apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import {
  documentCompleteUploadRequestDtoSchema,
  documentCompleteUploadResponseDtoSchema,
  documentDeleteResponseDtoSchema,
  documentDetailResponseDtoSchema,
  documentReprocessRequestDtoSchema,
  documentReprocessResponseDtoSchema,
  documentUploadIntentRequestDtoSchema,
  documentUploadIntentResponseDtoSchema,
  documentsListResponseDtoSchema,
  documentViewOriginalResponseDtoSchema,
  type DocumentCompleteUploadRequestDto,
  type DocumentCompleteUploadResponseDto,
  type DocumentDeleteResponseDto,
  type DocumentDetailResponseDto,
  type DocumentDomain,
  type DocumentReprocessRequestDto,
  type DocumentReprocessResponseDto,
  type DocumentUploadIntentRequestDto,
  type DocumentUploadIntentResponseDto,
  type DocumentsListResponseDto,
  type DocumentViewOriginalResponseDto,
} from "@/lib/contracts";

export const getDocuments = async (
  idToken: string,
  opts?: GetOptions & { domain?: DocumentDomain; limit?: number },
): Promise<ApiResult<DocumentsListResponseDto>> => {
  const params = new URLSearchParams();
  if (opts?.domain) params.set("domain", opts.domain);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const path = qs ? `/users/me/documents?${qs}` : "/users/me/documents";
  return apiGetZodAuthed(path, idToken, documentsListResponseDtoSchema, opts);
};

export const getDocumentDetail = async (
  idToken: string,
  documentId: string,
  opts?: GetOptions,
): Promise<ApiResult<DocumentDetailResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/documents/${encodeURIComponent(documentId)}`,
    idToken,
    documentDetailResponseDtoSchema,
    opts,
  );
};

export const createDocumentUploadIntent = async (
  idToken: string,
  body: DocumentUploadIntentRequestDto,
  opts?: PostOptions,
): Promise<ApiResult<DocumentUploadIntentResponseDto>> => {
  const parsed = documentUploadIntentRequestDtoSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 0,
      kind: "contract",
      error: "Invalid upload intent",
      requestId: null,
    };
  }
  return apiPostZodAuthed(
    "/users/me/documents/upload-intent",
    parsed.data,
    idToken,
    documentUploadIntentResponseDtoSchema,
    opts,
  );
};

export const completeDocumentUpload = async (
  idToken: string,
  documentId: string,
  body: DocumentCompleteUploadRequestDto,
  opts?: PostOptions,
): Promise<ApiResult<DocumentCompleteUploadResponseDto>> => {
  const parsed = documentCompleteUploadRequestDtoSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 0,
      kind: "contract",
      error: "Invalid complete-upload body",
      requestId: null,
    };
  }
  return apiPostZodAuthed(
    `/users/me/documents/${encodeURIComponent(documentId)}/complete-upload`,
    parsed.data,
    idToken,
    documentCompleteUploadResponseDtoSchema,
    opts,
  );
};

export const reprocessDocument = async (
  idToken: string,
  documentId: string,
  body?: DocumentReprocessRequestDto,
  opts?: PostOptions,
): Promise<ApiResult<DocumentReprocessResponseDto>> => {
  const parsed = documentReprocessRequestDtoSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      status: 0,
      kind: "contract",
      error: "Invalid reprocess body",
      requestId: null,
    };
  }
  return apiPostZodAuthed(
    `/users/me/documents/${encodeURIComponent(documentId)}/reprocess`,
    parsed.data,
    idToken,
    documentReprocessResponseDtoSchema,
    opts,
  );
};

export const deleteDocument = async (
  idToken: string,
  documentId: string,
  opts?: DeleteOptions,
): Promise<ApiResult<DocumentDeleteResponseDto>> => {
  return apiDeleteZodAuthed(
    `/users/me/documents/${encodeURIComponent(documentId)}`,
    idToken,
    documentDeleteResponseDtoSchema,
    opts,
  );
};

export const viewDocumentOriginal = async (
  idToken: string,
  documentId: string,
  opts?: GetOptions,
): Promise<ApiResult<DocumentViewOriginalResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/documents/${encodeURIComponent(documentId)}/view-original`,
    idToken,
    documentViewOriginalResponseDtoSchema,
    opts,
  );
};
