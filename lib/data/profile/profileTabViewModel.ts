// lib/data/profile/profileTabViewModel.ts
// Pure mapping: Profile tab chrome + error policy (no raw HTTP 404 / empty-doc noise).
import { resolveUserProfileMainForUi } from "@/lib/data/profile/resolveUserProfileMainForUi";
import type { UserProfileMainState } from "@/lib/data/profile/useUserProfileMain";
import type { UserProfileMain } from "@oli/contracts";

/**
 * Hook errors that match “missing profile/main” or HTTP 404 must not surface as red banner text.
 * Message shape: `${res.error} (kind=${res.kind}, status=${res.status})` from useUserProfileMain.
 */
export function isSuppressedProfileMainErrorMessage(message: string): boolean {
  if (/\bstatus=404\b/.test(message)) return true;
  if (/\bHTTP\s*404\b/i.test(message)) return true;
  return false;
}

export type ProfileTabViewModel = {
  profile: UserProfileMain | null;
  displayStatus: "missing" | "partial" | "ready" | "error";
  hydrating: boolean;
  isSaving: boolean;
  errorMessage: string | undefined;
};

/**
 * Profile tab: always resolve a display profile when signed in; suppress banners for empty/404-class failures.
 */
export function buildProfileTabViewModel(state: UserProfileMainState): ProfileTabViewModel {
  const profile = resolveUserProfileMainForUi(state);

  const treatErrorAsReadyChrome =
    state.status === "error" &&
    (state.profile === null || isSuppressedProfileMainErrorMessage(state.message));

  const displayStatus: ProfileTabViewModel["displayStatus"] =
    state.status === "missing"
      ? "missing"
      : treatErrorAsReadyChrome
        ? "ready"
        : state.status;

  const hydrating = state.status === "partial" && state.profile === null;
  const isSaving = state.status === "partial" && state.profile !== null;

  const errorMessage =
    state.status === "error" &&
    state.profile !== null &&
    !isSuppressedProfileMainErrorMessage(state.message)
      ? state.message
      : undefined;

  return { profile, displayStatus, hydrating, isSaving, errorMessage };
}
