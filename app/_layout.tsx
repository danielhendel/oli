// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "../lib/auth/AuthProvider";
import { PreferencesProvider } from "../lib/preferences/PreferencesProvider";

function RouteGuard() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const top = segments[0]; // "(auth)" | "(app)" | "debug" | ...
    const inAuthGroup = top === "(auth)";
    const inDebug = top === "debug";

    // ✅ Allow debug routes even when signed out (for token tools, API testing, etc.)
    if (inDebug) return;

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (user && inAuthGroup) {
      router.replace("/(app)/command-center");
    }
  }, [initializing, router, segments, user]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <StatusBar style="auto" />
        <RouteGuard />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Auth flow */}
          <Stack.Screen name="(auth)" />

          {/* Product shell */}
          <Stack.Screen name="(app)" />

          {/* Root index exists (can be used for deep-links / legacy) */}
          <Stack.Screen name="index" />

          {/* Debug area */}
          <Stack.Screen name="debug" />
        </Stack>
      </PreferencesProvider>
    </AuthProvider>
  );
}
