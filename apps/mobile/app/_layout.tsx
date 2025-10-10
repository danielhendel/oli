import React, { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import AuthProvider, { useAuth } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/theme'; // adjust the import if your theme exports differently

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initializing } = useAuth();

  const lastRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === 'auth';

    let target: string | null = null;
    if (!user && !inAuthGroup) target = '/auth/sign-in';
    else if (user && inAuthGroup) target = '/';

    if (target && lastRouteRef.current !== target) {
      lastRouteRef.current = target;
      router.replace(target);
    }
  }, [segments, user, initializing, router]);

  if (initializing) return null;

  return <Slot />;
}
