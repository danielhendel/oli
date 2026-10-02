/**
 * Subject context builder for Body Composition evidence (pure).
 * Ethnicity is intentionally omitted from V1.
 */

import type {
  BodyCompositionSubjectContext,
  UserProfileMain,
} from "@oli/contracts";

export type BodyCompositionSubjectContextInput = {
  profile: UserProfileMain | null;
  /** Optional effective timestamp for profile anthropometry (e.g. profile updatedAt). */
  profileEffectiveAt?: string | null;
};

export function buildBodyCompositionSubjectContext(
  input: BodyCompositionSubjectContextInput,
): BodyCompositionSubjectContext {
  const profile = input.profile;
  const effectiveAt = input.profileEffectiveAt?.trim() || null;
  return {
    sexAtBirth: profile?.identity.sexAtBirth ?? null,
    dateOfBirth: profile?.identity.dateOfBirth ?? null,
    height: {
      valueCm: profile?.body.heightCm ?? null,
      effectiveAt: profile?.body.heightCm != null ? effectiveAt : null,
      sourceSystem: profile?.body.heightCm != null ? "manual" : null,
    },
    waist: {
      valueCm: profile?.bodyInputs.waistCircumferenceCm ?? null,
      effectiveAt: profile?.bodyInputs.waistCircumferenceCm != null ? effectiveAt : null,
      sourceSystem: profile?.bodyInputs.waistCircumferenceCm != null ? "manual" : null,
      protocolId: null,
    },
  };
}
