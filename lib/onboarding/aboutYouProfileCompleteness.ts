// lib/onboarding/aboutYouProfileCompleteness.ts
import type { UserProfileMain } from "@oli/contracts";

/**
 * Required About You fields for Stage 2 profile-only onboarding completion.
 * Weight is optional and is not part of this gate.
 */
export function hasRequiredAboutYouProfile(profile: UserProfileMain | null | undefined): boolean {
  if (!profile) return false;
  return (
    typeof profile.identity.firstName === "string" &&
    profile.identity.firstName.trim().length > 0 &&
    profile.identity.dateOfBirth != null &&
    profile.identity.sexAtBirth != null &&
    profile.body.heightCm != null
  );
}
