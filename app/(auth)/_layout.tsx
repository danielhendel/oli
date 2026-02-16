// app/(auth)/_layout.tsx
/**
 * Purpose: Guards unauthenticated routes. Shows Splash while auth state loads.
 * Redirects signed-in users to the app stack.
 * Inputs: none (reads from AuthContext)
 * Side-effects: Navigation redirects
 * Errors: None (auth errors handled in AuthContext)
 */
import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import Splash from "@/components/Splash";

export default function AuthLayout() {
  const { state } = useAuth();

  switch (state.status) {
    case "loading":
      return <Splash />;

    case "signedIn":
      // Go straight into the app tabs when already signed in
      return <Redirect href="/(app)/(tabs)/dash" />;

    case "signedOut":
    default:
      // Show the auth stack (signin/signup flows)
      return <Stack screenOptions={{ headerShown: false }} />;
  }
}
