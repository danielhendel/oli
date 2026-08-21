// app/(auth)/sign-in.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { signInWithEmail } from "@/lib/auth/actions";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";
import {
  UI_APP_SCREEN_BG,
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0 && !submitting, [
    email,
    password,
    submitting,
  ]);

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok) {
        Alert.alert(result.title, result.message);
        return;
      }

      router.replace(CONSUMER_HOME_HREF);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="sign-in-screen">
      <View style={styles.container}>
        <Text style={styles.title}>Sign in</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={UI_TEXT_MUTED}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!submitting}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={UI_TEXT_MUTED}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          editable={!submitting}
        />

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit ? styles.buttonDisabled : null]}
        >
          <Text style={styles.buttonText}>{submitting ? "Signing in…" : "Sign in"}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Forgot password?"
          onPress={() => router.push("/(auth)/forgot-password")}
          disabled={submitting}
          style={styles.link}
          testID="sign-in-forgot-password"
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Create an account"
          onPress={() => router.push("/(auth)/sign-up")}
          disabled={submitting}
          style={styles.link}
          testID="sign-in-create-account"
        >
          <Text style={styles.linkText}>Create an account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16, color: UI_TEXT_PRIMARY },
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
});
