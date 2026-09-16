// lib/onboarding/useUnderstandReadiness.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import {
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
} from "@/lib/integrations/appleHealth/storage";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

import { markOnboardingCompleted } from "./advanceOnboardingStep";
import { buildDataReadinessViewModel } from "./dataReadiness";
import { mapOnboardingError } from "./mapOnboardingError";

export function useUnderstandReadiness() {
  const { getIdToken } = useAuth();
  const { state: profileState, refresh: refreshProfile } = useUserProfileMain();
  const ouraPresence = useOuraPresence();
  const today = getTodayDayKeyLocal();
  const dailyFacts = useDailyFacts(today);
  const router = useRouter();

  const [appleConnected, setAppleConnected] = useState<boolean | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === "ios");
  const [completing, setCompleting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (Platform.OS !== "ios") {
        if (!cancelled) {
          setAppleAvailable(false);
          setAppleConnected(false);
        }
        return;
      }
      const notAvailable = await getAppleHealthNotAvailable().catch(() => false);
      const connected = notAvailable
        ? false
        : await getAppleHealthConnected().catch(() => false);
      if (!cancelled) {
        setAppleAvailable(!notAvailable);
        setAppleConnected(connected);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = profileState.status === "ready" || profileState.status === "error" || profileState.status === "partial"
    ? profileState.profile
    : null;

  const ouraConnected =
    ouraPresence.status === "ready" ? ouraPresence.data.connected : ouraPresence.status === "error" ? false : null;

  const dailyFactsStatus =
    dailyFacts.status === "ready"
      ? ("ready" as const)
      : dailyFacts.status === "error"
        ? ("error" as const)
        : dailyFacts.status === "partial"
          ? ("partial" as const)
          : ("missing" as const);

  const dailyFactsDto = dailyFacts.status === "ready" ? dailyFacts.data : null;

  const viewModel = useMemo(
    () =>
      buildDataReadinessViewModel({
        profile,
        appleHealthConnected: appleConnected,
        appleHealthAvailable: appleAvailable,
        ouraConnected,
        dailyFacts: dailyFactsDto,
        dailyFactsStatus,
      }),
    [appleAvailable, appleConnected, dailyFactsDto, dailyFactsStatus, ouraConnected, profile],
  );

  const complete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    setBannerError(null);
    try {
      const token = await getIdToken(false);
      if (!token) {
        setBannerError("Please sign in again to continue.");
        return;
      }
      const res = await markOnboardingCompleted(token);
      if (!res.ok) {
        setBannerError(mapOnboardingError(new Error(res.error)).message);
        return;
      }
      await refreshProfile();
      router.replace(CONSUMER_HOME_HREF);
    } catch (e) {
      setBannerError(mapOnboardingError(e).message);
    } finally {
      setCompleting(false);
    }
  }, [completing, getIdToken, refreshProfile, router]);

  return {
    viewModel,
    completing,
    bannerError,
    complete,
  };
}
