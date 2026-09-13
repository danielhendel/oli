// lib/onboarding/useConnectSources.ts
/**
 * Connect-step orchestration.
 *
 * ROOT CAUSE (physical redbox): useOuraPresence() returns a new object every
 * render (`{ ...state, refetch }`). An effect that depended on that object and
 * called setOura(...) produced a maximum-update-depth loop.
 *
 * FIX: Derive card state with useMemo from scalar presence values + transient
 * action overlays. Never mirror presence into local state via effect.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { getOuraConnectUrl } from "@/lib/api/oura";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import {
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
} from "@/lib/integrations/appleHealth/storage";

import { connectAppleHealthForOnboarding } from "./appleHealthOnboardingConnect";
import { markOnboardingUnderstand } from "./advanceOnboardingStep";
import { CONNECT_COPY, ONBOARDING_ROUTES } from "./constants";
import { mapOnboardingError } from "./mapOnboardingError";
import {
  mapAppleHealthConnectCard,
  mapOuraConnectCard,
  type AppleHealthSnapshot,
  type OuraPresenceSnapshot,
  type SourceActionOverlay,
} from "./mapConnectSourceCards";

const OURA_AUTHORIZE_PREFIX = "https://cloud.ouraring.com/oauth/authorize";

function getOuraReturnUrl(): string {
  const base = (process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "").trim();
  if (base && base.startsWith("https://")) {
    return `${base.replace(/\/$/, "")}/integrations/oura/complete`;
  }
  return "com.olifitness.oli://oura-connected";
}

export function useConnectSources() {
  const { user, getIdToken } = useAuth();
  const ouraPresence = useOuraPresence();
  const { refresh: refreshProfile } = useUserProfileMain();
  const router = useRouter();

  const [appleSnapshot, setAppleSnapshot] = useState<AppleHealthSnapshot>({ status: "partial" });
  const [appleAction, setAppleAction] = useState<SourceActionOverlay>({ kind: "none" });
  const [ouraAction, setOuraAction] = useState<SourceActionOverlay>({ kind: "none" });
  const [advancing, setAdvancing] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const advancingRef = useRef(false);

  // One-shot account-scoped Apple Health flag read — no HealthKit query/ingest.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (Platform.OS !== "ios") {
        if (!cancelled) {
          setAppleSnapshot({
            status: "unavailable",
            reason: "Apple Health is available on iPhone.",
          });
        }
        return;
      }
      const notAvailable = await getAppleHealthNotAvailable().catch(() => false);
      if (cancelled) return;
      if (notAvailable) {
        setAppleSnapshot({
          status: "unavailable",
          reason: "Apple Health is not available on this device.",
        });
        return;
      }
      const connected = await getAppleHealthConnected().catch(() => false);
      if (cancelled) return;
      setAppleSnapshot({ status: "ready", connected });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Scalar presence deps only — never the whole ouraPresence wrapper object.
  const ouraPresenceStatus = ouraPresence.status;
  const ouraConnected =
    ouraPresence.status === "ready" ? ouraPresence.data.connected : null;
  const ouraRefetch = ouraPresence.refetch;

  const ouraPresenceSnapshot: OuraPresenceSnapshot = useMemo(() => {
    if (ouraPresenceStatus === "ready") {
      return { status: "ready", connected: ouraConnected === true };
    }
    if (ouraPresenceStatus === "error") {
      return { status: "error" };
    }
    return { status: "partial" };
  }, [ouraConnected, ouraPresenceStatus]);

  // Clear local Oura action overlay once server presence confirms connected.
  useEffect(() => {
    if (ouraPresenceStatus === "ready" && ouraConnected === true) {
      setOuraAction((prev) => (prev.kind === "none" ? prev : { kind: "none" }));
    }
  }, [ouraConnected, ouraPresenceStatus]);

  const apple = useMemo(
    () => mapAppleHealthConnectCard(appleSnapshot, appleAction),
    [appleAction, appleSnapshot],
  );

  const oura = useMemo(
    () => mapOuraConnectCard(ouraPresenceSnapshot, ouraAction),
    [ouraAction, ouraPresenceSnapshot],
  );

  const connectAppleHealth = useCallback(async () => {
    setBannerError(null);

    const runConnect = async () => {
      setAppleAction({ kind: "connecting" });
      try {
        const result = await connectAppleHealthForOnboarding({
          getIdToken,
          ...(user?.uid ? { userUid: user.uid } : {}),
        });
        if (!result.ok) {
          if (result.reason === "unavailable" || result.reason === "not_ios") {
            setAppleAction({ kind: "none" });
            setAppleSnapshot({
              status: "unavailable",
              reason: "Apple Health is not available on this device.",
            });
            return;
          }
          if (result.reason === "permission_denied") {
            setAppleAction({
              kind: "error",
              message: "Permission was not granted. You can try again or continue later.",
            });
            return;
          }
          setAppleAction({
            kind: "error",
            message: "Could not connect Apple Health. Try again.",
          });
          return;
        }
        setAppleAction({ kind: "none" });
        setAppleSnapshot({ status: "ready", connected: true });
      } catch (e) {
        setAppleAction({
          kind: "error",
          message: mapOnboardingError(e).message,
        });
      }
    };

    Alert.alert(
      CONNECT_COPY.appleHealthPrePermissionTitle,
      CONNECT_COPY.appleHealthPrePermissionBody,
      [
        {
          text: CONNECT_COPY.appleHealthPrePermissionCancel,
          style: "cancel",
        },
        {
          text: CONNECT_COPY.appleHealthPrePermissionContinue,
          onPress: () => {
            void runConnect();
          },
        },
      ],
    );
  }, [getIdToken, user?.uid]);

  const connectOura = useCallback(async () => {
    setBannerError(null);
    setOuraAction({ kind: "connecting" });
    try {
      const token = await getIdToken(true);
      if (!token) {
        setOuraAction({ kind: "error", message: "Please sign in again." });
        return;
      }
      const res = await getOuraConnectUrl(token);
      if (!res.ok || !res.json?.url) {
        setOuraAction({
          kind: "error",
          message: "Could not start Oura connection.",
        });
        return;
      }
      const authUrl = res.json.url;
      if (!authUrl.startsWith(OURA_AUTHORIZE_PREFIX)) {
        setOuraAction({
          kind: "error",
          message: "Invalid Oura authorization URL.",
        });
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, getOuraReturnUrl());
      if (result.type === "cancel") {
        setOuraAction({ kind: "none" });
        return;
      }
      setOuraAction({ kind: "none" });
      await ouraRefetch();
    } catch (e) {
      setOuraAction({
        kind: "error",
        message: mapOnboardingError(e).message,
      });
    }
  }, [getIdToken, ouraRefetch]);

  const advanceToUnderstand = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setAdvancing(true);
    setBannerError(null);
    try {
      const token = await getIdToken(false);
      if (!token) {
        setBannerError("Please sign in again to continue.");
        return;
      }
      const res = await markOnboardingUnderstand(token);
      if (!res.ok) {
        setBannerError(mapOnboardingError(new Error(res.error)).message);
        return;
      }
      await refreshProfile();
      router.replace(ONBOARDING_ROUTES.understand);
    } catch (e) {
      setBannerError(mapOnboardingError(e).message);
    } finally {
      advancingRef.current = false;
      setAdvancing(false);
    }
  }, [getIdToken, refreshProfile, router]);

  return {
    apple,
    oura,
    advancing,
    bannerError,
    connectAppleHealth,
    connectOura,
    /** Continues without connecting sources — no HealthKit / Oura side effects. */
    continueNext: advanceToUnderstand,
    /** Explicit skip path — identical persistence, no source actions. */
    skipForLater: advanceToUnderstand,
  };
}
