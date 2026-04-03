// lib/api/profileMain.ts
import { userProfileMainSchema, type UserProfileMain, type UserProfileMainPatch } from "@oli/contracts";
import type { ApiResult } from "./http";
import { apiGetZodAuthed, apiPutZodAuthed } from "./validate";

const userProfileMainGetResponseSchema = userProfileMainSchema.nullable();

export async function getUserProfileMain(idToken: string): Promise<ApiResult<UserProfileMain | null>> {
  return apiGetZodAuthed("/profile/main", idToken, userProfileMainGetResponseSchema);
}

export async function putUserProfileMain(
  idToken: string,
  patch: UserProfileMainPatch,
): Promise<ApiResult<UserProfileMain>> {
  return apiPutZodAuthed("/profile/main", patch, idToken, userProfileMainSchema);
}
