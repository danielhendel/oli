// app/(auth)/signin.tsx
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { getAuth, signInAnonymously /*, signInWithEmailAndPassword */ } from "firebase/auth";

import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignIn() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const useEmulators = Boolean(extra["useEmulators"]);

  const { signInWithApple, completeGoogleSignIn } = useAuth();
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"apple" | "dev" | null>(null);

  async function onApple() {
    setBusy("apple");
    setErr(null);
    try {
      await signInWithApple();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(null);
    }
  }

  async function devSignIn() {
    setBusy("dev");
    setErr(null);
    try {
      const auth = getAuth();
      // Option A: anonymous auth (fastest for emulator)
      await signInAnonymously(auth);

      // Option B: fixed email in emulator (uncomment if preferred)
      // await signInWithEmailAndPassword(auth, "dev@oli.app", "password123");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Dev sign-in failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 24, gap: 12 }}>
        <Text size="2xl" weight="bold">Welcome to Oli</Text>

        {/* Apple */}
        <Button
          label={busy === "apple" ? "Signing in…" : "Continue with Apple"}
          onPress={onApple}
          disabled={!!busy}
          accessibilityLabel="Continue with Apple"
        />

        {/* Google via id_token → AuthContext.completeGoogleSignIn */}
        <GoogleSignInButton onIdToken={completeGoogleSignIn} />

        {/* Dev (emulator) */}
        {useEmulators ? (
          <Button
            variant="ghost"
            label={busy === "dev" ? "Continuing…" : "Continue (Dev)"}
            onPress={devSignIn}
            disabled={!!busy}
            accessibilityLabel="Dev sign-in with emulator"
          />
        ) : null}

        {/* Error (a11y-friendly) */}
        {err ? (
          <Text tone="danger" style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
            {err}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
