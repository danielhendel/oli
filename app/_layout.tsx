// app/_layout.tsx
import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "../lib/auth/AuthProvider";
import { AccountDeletionRecoveryRunner } from "../lib/auth/AccountDeletionRecoveryRunner";
import { CONSUMER_HOME_HREF } from "../lib/navigation/consumerHome";
import { useEnsureOnboardingCompletionStamp } from "../lib/onboarding/useEnsureOnboardingCompletionStamp";
import { useOnboardingGate } from "../lib/onboarding/useOnboardingGate";
import { OliThemeProvider } from "../lib/ui/theme/OliThemeContext";
import { useNutritionOutboxSync } from "../lib/hooks/useNutritionOutboxSync";
import { ActivityRollupProvider } from "../lib/data/activity/ActivityRollupProvider";
import { useAppleHealthForcedYesterdayFinalize } from "../lib/data/activity/useAppleHealthForcedYesterdayFinalize";
import { PreferencesProvider } from "../lib/preferences/PreferencesProvider";
import { UserProfileMainProvider } from "../lib/data/profile/useUserProfileMain";

function AppleHealthForcedYesterdayFinalizeRunner() {
  useAppleHealthForcedYesterdayFinalize();
  return null;
}

function NutritionOutboxSyncRunner() {
  useNutritionOutboxSync();
  return null;
}

/** Ownership / deletion routes that must remain reachable during incomplete onboarding. */
function isOwnershipEscapePath(segments: string[]): boolean {
  if (segments[0] !== "(app)") return false;
  if (segments[1] !== "settings") return false;
  const leaf = segments[2];
  return (
    leaf === "account" ||
    leaf === "privacy" ||
    leaf === "your-data" ||
    leaf === "delete-account"
  );
}

function RouteGuard() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const gate = useOnboardingGate();

  useEffect(() => {
    if (initializing || gate.resolving) return;

    const top = segments[0]; // "(auth)" | "(app)" | "(onboarding)" | "debug" | ...
    const inAuthGroup = top === "(auth)";
    const inOnboardingGroup = top === "(onboarding)";
    const inDebug = top === "debug";
    const segs = segments as string[];

    // ✅ Allow debug routes even when signed out (for token tools, API testing, etc.)
    if (inDebug) return;

    // Deletion pending outranks onboarding — do not trap in onboarding.
    if (gate.state.kind === "deletion_pending") {
      if (inOnboardingGroup) {
        router.replace("/(app)/settings/delete-account");
      }
      return;
    }

    if (!user) {
      // Signed-out: Opening is the default entry; auth screens stay reachable.
      if (inAuthGroup) return;
      if (inOnboardingGroup && segs[1] == null) return; // opening index
      if (inOnboardingGroup) {
        router.replace("/(onboarding)");
        return;
      }
      router.replace("/(onboarding)");
      return;
    }

    // Signed-in
    if (gate.state.kind === "blocked_error") {
      // Stay put; screens can surface retry via profile refresh.
      return;
    }

    if (gate.state.kind === "completed") {
      if (inAuthGroup || inOnboardingGroup) {
        router.replace(CONSUMER_HOME_HREF);
      }
      return;
    }

    // Incomplete onboarding — never flash Home.
    if (isOwnershipEscapePath(segs)) {
      return;
    }

    const target = gate.targetHref;
    if (!target) return;

    const onCorrectStep =
      gate.state.kind === "about_you" && inOnboardingGroup && segs[1] === "about-you";

    if (onCorrectStep) return;

    router.replace(target as never);
  }, [gate.resolving, gate.state, gate.targetHref, initializing, router, segments, user]);

  return null;
}

function OnboardingCompletionStampRunner() {
  useEnsureOnboardingCompletionStamp();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OliThemeProvider>
      <AuthProvider>
        <ActivityRollupProvider>
          <PreferencesProvider>
            <UserProfileMainProvider>
              <StatusBar style="light" />
              <AppleHealthForcedYesterdayFinalizeRunner />
              <NutritionOutboxSyncRunner />
              <AccountDeletionRecoveryRunner />
              <OnboardingCompletionStampRunner />
              <RouteGuard />
              <Stack screenOptions={{ headerShown: false }}>
                {/* Auth flow */}
                <Stack.Screen name="(auth)" />

                {/* First-use onboarding */}
                <Stack.Screen name="(onboarding)" />

                {/* Product shell */}
                <Stack.Screen name="(app)" />

                {/* Root index exists (can be used for deep-links / legacy) */}
                <Stack.Screen name="index" />

                {/* Debug area — development only */}
                {__DEV__ && <Stack.Screen name="debug" options={{ headerShown: false }} />}
              </Stack>
            </UserProfileMainProvider>
          </PreferencesProvider>
        </ActivityRollupProvider>
      </AuthProvider>
      </OliThemeProvider>
    </GestureHandlerRootView>
  );
}
