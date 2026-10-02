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
      // Legacy undated profile waist is omitted from active subject context.
      // Dated RawEvent waist is the measurement authority; profile store/export retain the value.
      valueCm: null,
      effectiveAt: null,
      sourceSystem: null,
      protocolId: null,
    },
  };
}
