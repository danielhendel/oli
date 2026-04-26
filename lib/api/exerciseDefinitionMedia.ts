/**
 * Upload exercise reference image/video to API → Firebase Storage; returns HTTPS URL for definition fields.
 */
import type { ApiResult } from "@/lib/api/http";
import { debugRedactedAuthedUrl } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import {
  exerciseDefinitionMediaUploadResponseSchema,
  type ExerciseDefinitionMediaSlot,
} from "@oli/contracts";

function logExerciseMediaDebug(payload: Record<string, unknown>): void {
  console.info(JSON.stringify({ msg: "[exercise-media-debug]", ...payload }));
}

export async function uploadExerciseDefinitionMediaFile(
  idToken: string,
  exerciseId: string,
  body: {
    slot: ExerciseDefinitionMediaSlot;
    fileBase64: string;
    mimeType: string;
    filename: string;
  },
): Promise<ApiResult<{ url: string; slot: ExerciseDefinitionMediaSlot }>> {
  const path = `/exercise-definitions/${encodeURIComponent(exerciseId)}/media`;
  const fileBase64Length = body.fileBase64.length;
  const resolvedUrlRedacted = debugRedactedAuthedUrl(path);

  logExerciseMediaDebug({
    phase: "pre_request",
    method: "POST",
    relativePath: path,
    resolvedUrlRedacted,
    exerciseId,
    slot: body.slot,
    mimeType: body.mimeType,
    filename: body.filename,
    fileBase64Length,
    hasIdToken: typeof idToken === "string" && idToken.length > 0,
    timeoutMs: 120_000,
  });

  let res: ApiResult<{ url: string; slot: ExerciseDefinitionMediaSlot }>;
  try {
    res = await apiPostZodAuthed(path, body, idToken, exerciseDefinitionMediaUploadResponseSchema, {
      noStore: true,
      timeoutMs: 120_000,
    });
  } catch (err: unknown) {
    const networkException = err instanceof Error ? err.message : String(err);
    logExerciseMediaDebug({
      phase: "client_fetch_threw",
      exerciseId,
      slot: body.slot,
      fileBase64Length,
      networkException,
    });
    throw err;
  }

  if (!res.ok) {
    logExerciseMediaDebug({
      phase: "post_response_failure",
      exerciseId,
      slot: body.slot,
      fileBase64Length,
      status: res.status,
      kind: res.kind,
      requestId: res.requestId,
      hasIdToken: typeof idToken === "string" && idToken.length > 0,
      error: res.error,
      responseContentType:
        "responseContentType" in res ? (res.responseContentType ?? null) : null,
      bodySnippetFirst500:
        "bodySnippet" in res && typeof res.bodySnippet === "string" ? res.bodySnippet : undefined,
    });
    return res;
  }

  logExerciseMediaDebug({
    phase: "post_response_ok",
    exerciseId,
    slot: body.slot,
    fileBase64Length,
    status: res.status,
    requestId: res.requestId,
    responseContentType: res.responseContentType ?? null,
  });

  return res;
}
