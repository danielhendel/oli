// app/(auth)/sign-up.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { signUpWithEmail } from "@/lib/auth/actions";

export default function SignUpScreen() {
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
      const result = await signUpWithEmail(email, password);
      if (!result.ok) {
        Alert.alert(result.title, result.message);
        return;
      }

      // After sign up, treat as signed-in (Firebase does this by default).
      router.replace("/(app)/command-center");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        editable={!submitting}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        secureTextEntry
        placeholder="At least 6 characters"
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
        <Text style={styles.buttonText}>{submitting ? "Creating…" : "Create account"}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} disabled={submitting} style={styles.link}>
        <Text style={styles.linkText}>Back to sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 18,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 14, alignItems: "center" },
  linkText: { fontSize: 14, textDecorationLine: "underline" },
});
