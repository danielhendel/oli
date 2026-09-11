// lib/onboarding/useAboutYouForm.ts
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

import { ONBOARDING_ROUTES } from "./constants";
import { mapOnboardingError } from "./mapOnboardingError";
import {
  emptyAboutYouDraft,
  loadAboutYouDraft,
  saveAboutYouDraft,
} from "./onboardingDraftStorage";
import { saveAboutYou } from "./saveAboutYou";
import type { AboutYouDraft, AboutYouFieldErrors } from "./types";

export function useAboutYouForm() {
  const { user, getIdToken } = useAuth();
  const { refresh: refreshProfile } = useUserProfileMain();
  const prefs = usePreferences();
  const router = useRouter();

  const [draft, setDraft] = useState<AboutYouDraft>(emptyAboutYouDraft());
  const [errors, setErrors] = useState<AboutYouFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user?.uid) {
        if (!cancelled) {
          setDraft(emptyAboutYouDraft());
          setLoaded(true);
        }
        return;
      }
      const stored = await loadAboutYouDraft(user.uid);
      const mass = prefs.state.preferences.units.mass === "lb" ? "lb" : "kg";
      if (!cancelled) {
        setDraft({
          ...stored,
          weightUnit: stored.weightValue ? stored.weightUnit : mass,
          lengthUnit: stored.lengthUnit || "cm",
        });
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, prefs.state.preferences.units.mass]);

  const updateDraft = useCallback(
    (patch: Partial<AboutYouDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        if (user?.uid) {
          void saveAboutYouDraft(user.uid, next).catch(() => undefined);
        }
        return next;
      });
      setErrors({});
      setBannerError(null);
    },
    [user?.uid],
  );

  const submit = useCallback(async () => {
    if (!user?.uid || submitting) return;
    setSubmitting(true);
    setBannerError(null);
    try {
      const token = await getIdToken(false);
      if (!token) {
        setBannerError("Please sign in again to continue.");
        return;
      }
      const result = await saveAboutYou({ uid: user.uid, idToken: token, draft });
      if (!result.ok) {
        if (result.kind === "validation") {
          setErrors(result.errors);
          return;
        }
        setBannerError(mapOnboardingError(new Error(result.message)).message);
        return;
      }
      await refreshProfile();
      router.replace(ONBOARDING_ROUTES.connect);
    } catch (e) {
      setBannerError(mapOnboardingError(e).message);
    } finally {
      setSubmitting(false);
    }
  }, [draft, getIdToken, refreshProfile, router, submitting, user?.uid]);

  return {
    draft,
    errors,
    submitting,
    bannerError,
    loaded,
    updateDraft,
    submit,
  };
}
