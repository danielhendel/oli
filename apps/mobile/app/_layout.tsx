// apps/mobile/app/_layout.tsx
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, Redirect, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import AuthProvider, { useAuth } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/theme';

// Keep the native splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {
  // In tests / edge cases, this can throw; we safely ignore.
});

/**
 * RootRedirect:
 * - Handles the "launched at /" case.
 * - If there is no pathname or it is just "/", send the user to auth entry.
 * - AuthGate (inside the app shell) will later take care of pushing authenticated users into the (app) group.
 */
function RootRedirect() {
  const pathname = usePathname();

  // If the app is launched at oli:/// (no path), redirect to auth entry.
  if (!pathname || pathname === '/' || pathname === '') {
    return <Redirect href="/auth/sign-in" />;
  }
  return null;
}

/**
 * RootShell:
 * - Waits for auth initialization to finish.
 * - Hides splash screen once we know the auth state.
 * - Renders the routed content.
 */
function RootShell() {
  const { initializing } = useAuth();

  useEffect(() => {
    if (!initializing) {
      // Once auth is ready, hide the splash screen.
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors in tests / rare race conditions.
      });
    }
  }, [initializing]);

  return (
    <>
      <RootRedirect />
      <Slot />
    </>
  );
}

/**
 * RootLayout:
 * - Global provider stack
 * - Safe area + gestures + theme + auth
 * - Hosts the RootShell which manages splash + routing logic
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootShell />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
