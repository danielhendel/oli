/**
 * Consumer account data export API client (Stage 1B).
 */

import type { ApiResult } from "@/lib/api/http";
import type { GetOptions, PostOptions } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import { apiGetZodAuthed } from "@/lib/api/validate";
import {
  exportDownloadResponseDtoSchema,
  exportLatestResponseDtoSchema,
  exportRequestResponseDtoSchema,
  exportStatusResponseDtoSchema,
  type ExportDownloadResponseDto,
  type ExportLatestResponseDto,
  type ExportRequestResponseDto,
  type ExportStatusResponseDto,
} from "@/lib/contracts";

export type RequestUserDataExportOptions = PostOptions & {
  clientRequestId: string;
};

export async function requestUserDataExport(
  idToken: string,
  opts: RequestUserDataExportOptions,
): Promise<ApiResult<ExportRequestResponseDto>> {
  return apiPostZodAuthed(
    "/export",
    {},
    idToken,
    exportRequestResponseDtoSchema,
    {
      noStore: true,
      clientRequestId: opts.clientRequestId,
      timeoutMs: opts.timeoutMs ?? 30_000,
    },
  );
}

export async function getLatestUserDataExport(
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<ExportLatestResponseDto>> {
  return apiGetZodAuthed("/export/latest", idToken, exportLatestResponseDtoSchema, {
    noStore: true,
    ...opts,
  });
}

export async function getUserDataExportStatus(
  idToken: string,
  requestId: string,
  opts?: GetOptions,
): Promise<ApiResult<ExportStatusResponseDto>> {
  return apiGetZodAuthed(
    `/export/${encodeURIComponent(requestId)}`,
    idToken,
    exportStatusResponseDtoSchema,
    { noStore: true, ...opts },
  );
}

export async function getUserDataExportDownload(
  idToken: string,
  requestId: string,
  opts?: GetOptions,
): Promise<ApiResult<ExportDownloadResponseDto>> {
  return apiGetZodAuthed(
    `/export/${encodeURIComponent(requestId)}/download`,
    idToken,
    exportDownloadResponseDtoSchema,
    { noStore: true, timeoutMs: opts?.timeoutMs ?? 30_000, ...opts },
  );
}
