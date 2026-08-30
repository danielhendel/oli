/**
 * Consumer account deletion API client (Stage 1C).
 */

import type { ApiResult } from "@/lib/api/http";
import type { GetOptions, PostOptions } from "@/lib/api/http";
import { apiGetZodAuthed, apiPostZodAuthed } from "@/lib/api/validate";
import {
  deleteLatestResponseDtoSchema,
  deleteRequestResponseDtoSchema,
  deleteStatusResponseDtoSchema,
  type DeleteLatestResponseDto,
  type DeleteRequestResponseDto,
  type DeleteStatusResponseDto,
} from "@/lib/contracts";

export type RequestAccountDeletionOptions = PostOptions & {
  clientRequestId: string;
};

export async function requestAccountDeletion(
  idToken: string,
  opts: RequestAccountDeletionOptions,
): Promise<ApiResult<DeleteRequestResponseDto>> {
  return apiPostZodAuthed(
    "/account/delete",
    {},
    idToken,
    deleteRequestResponseDtoSchema,
    {
      noStore: true,
      clientRequestId: opts.clientRequestId,
      timeoutMs: opts.timeoutMs ?? 30_000,
    },
  );
}

export async function getLatestAccountDeletion(
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<DeleteLatestResponseDto>> {
  return apiGetZodAuthed("/delete/latest", idToken, deleteLatestResponseDtoSchema, {
    noStore: true,
    ...opts,
  });
}

export async function getAccountDeletionStatus(
  idToken: string,
  requestId: string,
  opts?: GetOptions,
): Promise<ApiResult<DeleteStatusResponseDto>> {
  return apiGetZodAuthed(
    `/delete/${encodeURIComponent(requestId)}`,
    idToken,
    deleteStatusResponseDtoSchema,
    { noStore: true, ...opts },
  );
}

function createDeletionRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `delete-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export { createDeletionRequestId };
