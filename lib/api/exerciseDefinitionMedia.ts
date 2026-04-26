/**
 * Upload exercise reference image/video to API → Firebase Storage; returns HTTPS URL for definition fields.
 */
import type { ApiResult } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import {
  exerciseDefinitionMediaUploadResponseSchema,
  type ExerciseDefinitionMediaSlot,
} from "@oli/contracts";

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
  return apiPostZodAuthed(path, body, idToken, exerciseDefinitionMediaUploadResponseSchema, {
    noStore: true,
    timeoutMs: 120_000,
  });
}
