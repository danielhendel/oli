// lib/data/profile/resolveUserProfileMainForUi.ts
// Single place to map hook state → profile shown in UI/forms. Missing doc / failed GET must never block on null.
import { defaultUserProfileMain, type UserProfileMain } from "@oli/contracts";
import type { UserProfileMainState } from "@/lib/data/profile/useUserProfileMain";

/**
 * Profile for lists and editors when the user is signed in.
 * - `missing` (no auth user): null
 * - Otherwise: server profile if loaded, else defaults (empty profile is valid)
 */
export function resolveUserProfileMainForUi(state: UserProfileMainState): UserProfileMain | null {
  if (state.status === "missing") return null;
  if (state.status === "ready") return state.profile ?? defaultUserProfileMain();
  if (state.status === "partial") return state.profile ?? defaultUserProfileMain();
  return state.profile ?? defaultUserProfileMain();
}
