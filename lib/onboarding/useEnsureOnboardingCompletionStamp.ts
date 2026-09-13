// lib/onboarding/useEnsureOnboardingCompletionStamp.ts
import { useEffect, useRef } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";

import { markOnboardingCompleted } from "./advanceOnboardingStep";
import { needsOnboardingCompletionStamp } from "./resolveOnboardingState";

/**
 * Stamps `app.onboarding` completed at the current version when About You is
 * already complete (including stale connect/understand migrations).
 * Does not start source sync or readiness work.
 */
export function useEnsureOnboardingCompletionStamp(): void {
  const { user, getIdToken } = useAuth();
  const { state: profileState, refresh } = useUserProfileMain();
  const inFlightUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      inFlightUidRef.current = null;
      return;
    }
    if (profileState.status !== "ready" || !profileState.profile) return;
    if (!needsOnboardingCompletionStamp(profileState.profile)) return;
    if (inFlightUidRef.current === user.uid) return;

    inFlightUidRef.current = user.uid;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(false);
        if (!token || cancelled) return;
        const res = await markOnboardingCompleted(token);
        if (res.ok && !cancelled) {
          await refresh();
        }
      } catch {
        // Best-effort stamp; routing already treats complete About You as Home.
      } finally {
        if (!cancelled) {
          inFlightUidRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getIdToken, profileState, refresh, user?.uid]);
}
