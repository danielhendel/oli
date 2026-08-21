// app/(auth)/forgot-password.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { requestPasswordReset } from "@/lib/auth/actions";
import {
  UI_APP_SCREEN_BG,
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type ScreenPhase = "form" | "success";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [phase, setPhase] = useState<ScreenPhase>("form");
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && !submitting && phase === "form",
    [email, submitting, phase],
  );

  const clearError = (): void => {
    setErrorTitle(null);
    setErrorMessage(null);
  };

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) return;

    clearError();
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setErrorTitle(result.title);
        setErrorMessage(result.message);
        return;
      }
      setPhase("success");
    } finally {
      setSubmitting(false);
    }
  };

  const onReturnToSignIn = (): void => {
    router.replace("/(auth)/sign-in");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="forgot-password-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.container}>
            <Text
              style={styles.title}
              accessibilityRole="header"
              testID="forgot-password-title"
            >
              Reset your password
            </Text>

            {phase === "form" ? (
              <>
                <Text style={styles.explanation} testID="forgot-password-explanation">
                  Enter the email associated with your Oli account.
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  ref={emailRef}
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  placeholder="you@example.com"
                  placeholderTextColor={UI_TEXT_MUTED}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorTitle || errorMessage) clearError();
                  }}
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  style={styles.input}
                  editable={!submitting}
                  testID="forgot-password-email"
                />

                {errorTitle && errorMessage ? (
                  <View
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                    style={styles.errorBox}
                    testID="forgot-password-error"
                  >
                    <Text style={styles.errorTitle}>{errorTitle}</Text>
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send reset instructions"
                  accessibilityState={{ disabled: !canSubmit, busy: submitting }}
                  onPress={() => {
                    void onSubmit();
                  }}
                  disabled={!canSubmit}
                  style={[styles.button, !canSubmit ? styles.buttonDisabled : null]}
                  testID="forgot-password-submit"
                >
                  <Text style={styles.buttonText}>
                    {submitting ? "Sending…" : "Send reset instructions"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <View
                accessibilityLiveRegion="polite"
                style={styles.successBox}
                testID="forgot-password-success"
              >
                <Text style={styles.successTitle}>Check your email</Text>
                <Text style={styles.successBody}>
                  If an Oli account exists for that address, we sent password-reset instructions.
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to Sign In"
              onPress={onReturnToSignIn}
              disabled={submitting}
              style={styles.link}
              testID="forgot-password-return-sign-in"
            >
              <Text style={styles.linkText}>Return to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12, color: UI_TEXT_PRIMARY },
  explanation: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    marginBottom: 8,
  },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14, color: UI_TEXT_SECONDARY },
  input: {
    borderWidth: 1,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    color: UI_TEXT_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  button: {
    marginTop: 18,
    backgroundColor: UI_TEXT_PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: UI_APP_SCREEN_BG, fontSize: 16, fontWeight: "600" },
  link: { marginTop: 14, minHeight: 44, alignItems: "center", justifyContent: "center" },
  linkText: { fontSize: 14, textDecorationLine: "underline", color: UI_TEXT_PRIMARY },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    gap: 4,
  },
  errorTitle: { fontSize: 15, fontWeight: "700", color: UI_TEXT_PRIMARY },
  errorMessage: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  successBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: UI_CARD_SURFACE,
    gap: 8,
  },
  successTitle: { fontSize: 18, fontWeight: "700", color: UI_TEXT_PRIMARY },
  successBody: { fontSize: 15, lineHeight: 22, color: UI_TEXT_SECONDARY },
});
