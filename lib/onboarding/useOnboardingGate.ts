// lib/onboarding/useOnboardingGate.ts
import { useEffect, useMemo, useState } from "react";
import type { UserProfileMain } from "@oli/contracts";

import { useAuth } from "@/lib/auth/AuthProvider";
import { readAccountDeletionRecoveryMarker } from "@/lib/auth/accountLifecycleCleanup";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";

import {
  onboardingHrefForState,
  resolveOnboardingState,
} from "./resolveOnboardingState";
import type { OnboardingRouteState } from "./types";

export type OnboardingGate = {
  state: OnboardingRouteState;
  targetHref: string | null;
  /** True while auth or profile or deletion marker is still resolving. */
  resolving: boolean;
};

/**
 * Hook used by RouteGuard (and onboarding screens) to decide first-use routing.
 * Server profile onboarding is authoritative; deletion pending outranks onboarding.
 */
export function useOnboardingGate(): OnboardingGate {
  const { user, initializing } = useAuth();
  const { state: profileState } = useUserProfileMain();
  const [deletionPending, setDeletionPending] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const marker = await readAccountDeletionRecoveryMarker();
      if (!cancelled) {
        setDeletionPending(marker != null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return useMemo(() => {
    if (initializing || deletionPending === null) {
      return { state: { kind: "resolving" as const }, targetHref: null, resolving: true };
    }

    const auth = !user ? ("signed_out" as const) : ("signed_in" as const);

    let profileStatus: "missing" | "partial" | "ready" | "error";
    let profile: UserProfileMain | null = null;
    let profileErrorMessage: string | null = null;

    if (!user) {
      profileStatus = "missing";
    } else if (profileState.status === "ready") {
      profileStatus = "ready";
      profile = profileState.profile;
    } else if (profileState.status === "error") {
      profileStatus = "error";
      profile = profileState.profile;
      profileErrorMessage = profileState.message;
    } else if (profileState.status === "partial") {
      profileStatus = "partial";
      profile = profileState.profile;
    } else {
      profileStatus = "missing";
    }

    const state = resolveOnboardingState({
      auth,
      deletionPending,
      profileStatus,
      profile,
      profileErrorMessage,
    });

    return {
      state,
      targetHref: onboardingHrefForState(state),
      resolving: state.kind === "resolving",
    };
  }, [deletionPending, initializing, profileState, user]);
}
