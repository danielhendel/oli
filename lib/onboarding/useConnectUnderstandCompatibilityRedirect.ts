// lib/onboarding/useConnectUnderstandCompatibilityRedirect.ts
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

import { markOnboardingCompleted } from "./advanceOnboardingStep";
import { hasRequiredAboutYouProfile } from "./aboutYouProfileCompleteness";
import { ONBOARDING_ROUTES } from "./constants";
import { needsOnboardingCompletionStamp } from "./resolveOnboardingState";

/**
 * Compatibility for stale /connect and /understand deep links.
 * Incomplete About You → About You. Complete → stamp + Home.
 * Starts no source sync and no readiness work.
 */
export function useConnectUnderstandCompatibilityRedirect(): void {
  const { user, initializing, getIdToken } = useAuth();
  const { state: profileState } = useUserProfileMain();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (initializing || redirectedRef.current) return;

    if (!user) {
      redirectedRef.current = true;
      router.replace(ONBOARDING_ROUTES.opening);
      return;
    }

    if (profileState.status === "partial" || profileState.status === "missing") return;

    const profile =
      profileState.status === "ready" || profileState.status === "error"
        ? profileState.profile
        : null;

    if (!hasRequiredAboutYouProfile(profile)) {
      redirectedRef.current = true;
      router.replace(ONBOARDING_ROUTES.aboutYou);
      return;
    }

    redirectedRef.current = true;
    void (async () => {
      if (needsOnboardingCompletionStamp(profile)) {
        const token = await getIdToken(false);
        if (token) {
          await markOnboardingCompleted(token).catch(() => undefined);
        }
      }
      router.replace(CONSUMER_HOME_HREF);
    })();
  }, [getIdToken, initializing, profileState, router, user]);
}
