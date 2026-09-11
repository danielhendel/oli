// lib/onboarding/resolveOnboardingState.ts
import { CURRENT_ONBOARDING_VERSION, type UserProfileMain } from "@oli/contracts";
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
 * Server `app.onboarding` is authoritative when profile is ready.
 * Deletion pending always outranks onboarding.
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

  const onboarding = input.profile?.app.onboarding;
  if (!onboarding) {
    return { kind: "about_you" };
  }

  if (onboarding.status === "completed" && onboarding.version >= CURRENT_ONBOARDING_VERSION) {
    return { kind: "completed" };
  }

  if (onboarding.step === "connect") return { kind: "connect" };
  if (onboarding.step === "understand") return { kind: "understand" };
  if (onboarding.step === "about_you") return { kind: "about_you" };

  // not_started / null step / older incomplete → start at About You
  return { kind: "about_you" };
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
