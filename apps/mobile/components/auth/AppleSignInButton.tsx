import React, { useEffect, useMemo, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { Alert, Platform, View } from "react-native";
import { signInWithApple } from "../../lib/auth/oauth/apple";
import { mapFirebaseAuthError } from "../../lib/errors/mapFirebaseAuthError";

type Props = {
  disabled?: boolean;
  onStart?: () => void;
  onFinish?: () => void;
  testID?: string;
};

export function AppleSignInButton({ disabled, onStart, onFinish, testID }: Props) {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean>(Platform.OS === "ios"); // default false on Android

  // Only show the button if the native module is present (dev client or native build)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok =
          typeof AppleAuthentication.isAvailableAsync === "function" &&
          (await AppleAuthentication.isAvailableAsync());
        if (mounted) setAvailable(Boolean(ok));
      } catch {
        if (mounted) setAvailable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isDisabled = useMemo(() => !!disabled || loading, [disabled, loading]);

  const onPress = async () => {
    if (isDisabled) return;
    try {
      onStart?.();
      setLoading(true);
      await signInWithApple();
    } catch (e: any) {
      // Prefer our friendly Apple messages; fall back to Firebase mapper
      const msg =
        e?.message ??
        mapFirebaseAuthError(e) ??
        "Apple Sign-In failed. Please try again.";
      Alert.alert("Apple Sign In", msg);
      // Optional: log for debugging
      // console.error("APPLE_SIGN_IN_ERROR", e?.code, e?.message, e);
    } finally {
      setLoading(false);
      onFinish?.();
    }
  };

  // Hide entirely when unavailable (Expo Go / missing entitlement / Android)
  if (!available) return null;

  return (
    <View
      style={{ opacity: isDisabled ? 0.6 : 1 }}
      pointerEvents={isDisabled ? "none" : "auto"}
      accessible
      accessibilityLabel="Sign in with Apple"
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <AppleAuthentication.AppleAuthenticationButton
        testID={testID}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={{ width: "100%", height: 48 }}
        onPress={onPress}
      />
    </View>
  );
}

export default AppleSignInButton;
