// apps/mobile/components/auth/AuthGate.tsx
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Global auth-aware route guard.
 *
 * Behavior:
 * - If unauthenticated and in private group (app) → /auth/sign-in
 * - If authenticated and in auth group → /(app) (root of the private app)
 *
 * Important: Always navigate to a concrete screen (not a group).
 */
export default function AuthGate() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // First segment identifies the route group, e.g. '(app)' or 'auth'
  const root = segments[0] ?? '';
  const inPrivateApp = root === '(app)';
  const inAuth = root === 'auth';

  useEffect(() => {
    if (initializing) return;

    // not signed in → protect the private group
    if (!user && inPrivateApp) {
      router.replace('/auth/sign-in');
      return;
    }

    // signed in → leaving the auth group takes you to the app root
    if (user && inAuth) {
      router.replace('/(app)'); // hits app/(app)/index.tsx
      return;
    }
  }, [user, initializing, inPrivateApp, inAuth, router]);

  return null;
}
