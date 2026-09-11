// lib/onboarding/useConnectSources.ts
import { useCallback, useEffect, useState } from "react";
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
import type { ConnectSourceCardState } from "./types";

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

  const [apple, setApple] = useState<ConnectSourceCardState>({ id: "apple_health", status: "idle" });
  const [oura, setOura] = useState<ConnectSourceCardState>({ id: "oura", status: "idle" });
  const [advancing, setAdvancing] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (Platform.OS !== "ios") {
        if (!cancelled) {
          setApple({
            id: "apple_health",
            status: "unavailable",
            reason: "Apple Health is available on iPhone.",
          });
        }
        return;
      }
      const notAvailable = await getAppleHealthNotAvailable().catch(() => false);
      if (cancelled) return;
      if (notAvailable) {
        setApple({
          id: "apple_health",
          status: "unavailable",
          reason: "Apple Health is not available on this device.",
        });
        return;
      }
      const connected = await getAppleHealthConnected().catch(() => false);
      if (cancelled) return;
      setApple({
        id: "apple_health",
        status: connected ? "connected" : "idle",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ouraPresence.status === "ready") {
      setOura({
        id: "oura",
        status: ouraPresence.data.connected ? "connected" : "idle",
      });
    } else if (ouraPresence.status === "error") {
      setOura({
        id: "oura",
        status: "error",
        message: "Could not check Oura status.",
      });
    }
  }, [ouraPresence]);

  const connectAppleHealth = useCallback(async () => {
    setBannerError(null);

    const runConnect = async () => {
      setApple({ id: "apple_health", status: "connecting" });
      try {
        const result = await connectAppleHealthForOnboarding({
          getIdToken,
          userUid: user?.uid,
        });
        if (!result.ok) {
          if (result.reason === "unavailable" || result.reason === "not_ios") {
            setApple({
              id: "apple_health",
              status: "unavailable",
              reason: "Apple Health is not available on this device.",
            });
            return;
          }
          if (result.reason === "permission_denied") {
            setApple({
              id: "apple_health",
              status: "error",
              message: "Permission was not granted. You can try again or continue later.",
            });
            return;
          }
          setApple({
            id: "apple_health",
            status: "error",
            message: "Could not connect Apple Health. Try again.",
          });
          return;
        }
        setApple({ id: "apple_health", status: "connected" });
      } catch (e) {
        setApple({
          id: "apple_health",
          status: "error",
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
          onPress: () => {
            setApple({ id: "apple_health", status: "idle" });
          },
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
    setOura({ id: "oura", status: "connecting" });
    try {
      const token = await getIdToken(true);
      if (!token) {
        setOura({ id: "oura", status: "error", message: "Please sign in again." });
        return;
      }
      const res = await getOuraConnectUrl(token);
      if (!res.ok || !res.json?.url) {
        setOura({
          id: "oura",
          status: "error",
          message: "Could not start Oura connection.",
        });
        return;
      }
      const authUrl = res.json.url;
      if (!authUrl.startsWith(OURA_AUTHORIZE_PREFIX)) {
        setOura({
          id: "oura",
          status: "error",
          message: "Invalid Oura authorization URL.",
        });
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, getOuraReturnUrl());
      if (result.type === "cancel") {
        setOura({ id: "oura", status: "idle" });
        return;
      }
      await ouraPresence.refetch();
      // Stay on connect screen after OAuth return.
    } catch (e) {
      setOura({
        id: "oura",
        status: "error",
        message: mapOnboardingError(e).message,
      });
    }
  }, [getIdToken, ouraPresence]);

  const continueNext = useCallback(async () => {
    if (advancing) return;
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
      setAdvancing(false);
    }
  }, [advancing, getIdToken, refreshProfile, router]);

  return {
    apple,
    oura,
    advancing,
    bannerError,
    connectAppleHealth,
    connectOura,
    continueNext,
    skipForLater: continueNext,
  };
}
