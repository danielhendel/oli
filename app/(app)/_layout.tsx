// app/(app)/_layout.tsx
/**
 * Purpose: Guards the signed-in app routes. Shows Splash while auth state loads.
 * Redirects signed-out users back to the auth stack.
 * Inputs: none (reads from AuthContext)
 * Side-effects: Navigation redirects
 * Errors: None (auth errors handled in AuthContext)
 */
import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import Splash from "@/components/Splash";

export default function AppLayout() {
  const { state } = useAuth();

  switch (state.status) {
    case "loading":
      return <Splash />;

    case "signedOut":
      return <Redirect href="/(auth)/signin" />;

    case "signedIn":
    default:
      // Render the signed-in app stack (tabs and nested routes)
      return <Stack screenOptions={{ headerShown: false }} />;
  }
}
