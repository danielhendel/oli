// apps/mobile/app/_layout.tsx
import React from 'react';
import { Slot, Redirect, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider from '@/providers/AuthProvider';
import { ThemeProvider } from '@/theme';

function RootRedirect() {
  const pathname = usePathname();
  if (!pathname || pathname === '/' || pathname === '') {
    return <Redirect href="/auth/sign-in" />;
  }
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootRedirect />
          <Slot />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
