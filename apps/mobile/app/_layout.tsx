// apps/mobile/app/_layout.tsx
import { Slot, Redirect, usePathname } from 'expo-router';
import AuthProvider from '@/providers/AuthProvider';
import { ThemeProvider } from '@/theme';

function RootRedirect() {
  const pathname = usePathname();
  // If the app is launched at oli:/// (no path), redirect to auth entry.
  if (!pathname || pathname === '/' || pathname === '') {
    return <Redirect href="/auth/sign-in" />;
  }
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootRedirect />
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
