// app/(auth)/index.tsx
import React from "react";
import { View } from "react-native";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignInScreen() {
  const { signInWithApple, completeGoogleSignIn, error } = useAuth();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text size="2xl" weight="bold">Welcome to Oli</Text>

      {/* Apple */}
      <Button
        label="Continue with Apple"
        onPress={signInWithApple}
        accessibilityLabel="Sign in with Apple"
      />

      {/* Google via id_token */}
      <GoogleSignInButton onIdToken={completeGoogleSignIn} />

      {/* Auth error (a11y-friendly) */}
      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

