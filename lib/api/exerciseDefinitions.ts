/**
 * Client API for user-owned exercise definitions (`/exercise-definitions`).
 */
import type { ApiResult } from "@/lib/api/http";
import { apiGetZodAuthed, apiPostZodAuthed, apiPutZodAuthed } from "@/lib/api/validate";
import {
  exerciseDefinitionListResponseSchema,
  exerciseDefinitionRowSchema,
  type ExerciseDefinitionCreateBody,
  type ExerciseDefinitionListResponse,
  type ExerciseDefinitionRow,
  type ExerciseDefinitionUpdateBody,
} from "@oli/contracts";

export async function listExerciseDefinitions(
  idToken: string,
): Promise<ApiResult<ExerciseDefinitionListResponse>> {
  return apiGetZodAuthed("/exercise-definitions", idToken, exerciseDefinitionListResponseSchema, {
    noStore: true,
  });
}

export async function createExerciseDefinition(
  idToken: string,
  body: ExerciseDefinitionCreateBody,
): Promise<ApiResult<ExerciseDefinitionRow>> {
  return apiPostZodAuthed("/exercise-definitions", body, idToken, exerciseDefinitionRowSchema, {
    noStore: true,
    timeoutMs: 15000,
  });
}

export async function updateExerciseDefinition(
  idToken: string,
  exerciseId: string,
  body: ExerciseDefinitionUpdateBody,
): Promise<ApiResult<ExerciseDefinitionRow>> {
  const path = `/exercise-definitions/${encodeURIComponent(exerciseId)}`;
  return apiPutZodAuthed(path, body, idToken, exerciseDefinitionRowSchema, { noStore: true, timeoutMs: 15000 });
}
