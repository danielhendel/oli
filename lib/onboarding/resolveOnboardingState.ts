// lib/onboarding/resolveOnboardingState.ts
import { CURRENT_ONBOARDING_VERSION, type UserProfileMain } from "@oli/contracts";

import { hasRequiredAboutYouProfile } from "./aboutYouProfileCompleteness";
import type { OnboardingRouteState } from "./types";

export type ResolveOnboardingStateInput = {
  auth: "signed_out" | "initializing" | "signed_in";
  /** Local recovery marker or server deletion-pending signal. */
  deletionPending: boolean;
  profileStatus: "missing" | "partial" | "ready" | "error";
  profile: UserProfileMain | null;
  profileErrorMessage?: string | null;
};

/**
 * Pure resolver for first-use routing.
 * Server profile fields are authoritative for About You completeness.
 * Deletion pending always outranks onboarding.
 *
 * Stage 2 (v2): Opening → About You → Home.
 * Persisted connect/understand steps with a complete About You profile
 * route Home (compatibility screens stamp completion).
 */
export function resolveOnboardingState(input: ResolveOnboardingStateInput): OnboardingRouteState {
  if (input.auth === "initializing") {
    return { kind: "resolving" };
  }

  if (input.auth === "signed_out") {
    return { kind: "opening" };
  }

  if (input.deletionPending) {
    return { kind: "deletion_pending" };
  }

  if (input.profileStatus === "partial" || input.profileStatus === "missing") {
    return { kind: "resolving" };
  }

  if (input.profileStatus === "error") {
    const msg = (input.profileErrorMessage ?? "").toLowerCase();
    if (msg.includes("account_deletion_pending") || msg.includes("deletion_pending")) {
      return { kind: "deletion_pending" };
    }
    return {
      kind: "blocked_error",
      message: input.profileErrorMessage?.trim() || "We couldn’t load your profile.",
    };
  }

  if (!hasRequiredAboutYouProfile(input.profile)) {
    return { kind: "about_you" };
  }

  return { kind: "completed" };
}

export function onboardingHrefForState(state: OnboardingRouteState): string | null {
  switch (state.kind) {
    case "opening":
      return "/(onboarding)";
    case "about_you":
      return "/(onboarding)/about-you";
    case "connect":
      return "/(onboarding)/connect";
    case "understand":
      return "/(onboarding)/understand";
    default:
      return null;
  }
}

/** True when server onboarding should be stamped completed at the current version. */
export function needsOnboardingCompletionStamp(profile: UserProfileMain | null): boolean {
  if (!hasRequiredAboutYouProfile(profile)) return false;
  const onboarding = profile?.app.onboarding;
  if (!onboarding) return true;
  if (onboarding.status !== "completed") return true;
  if (onboarding.version < CURRENT_ONBOARDING_VERSION) return true;
  return false;
}
