// app/(auth)/sign-in.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";

import { getFirebaseAuth } from "@/lib/firebaseConfig";

type AuthErrorLike = { code?: string; message?: string };

const toAuthMessage = (err: unknown): string => {
  const e = err as AuthErrorLike;
  const code = typeof e?.code === "string" ? e.code : "";
  const msg = typeof e?.message === "string" ? e.message : "Unknown error";

  if (code.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (code.includes("auth/user-not-found")) return "No account found for that email.";
  if (code.includes("auth/wrong-password")) return "Invalid email or password.";
  if (code.includes("auth/invalid-email")) return "Please enter a valid email address.";
  if (code.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";

  return msg;
};

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
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (err) {
      Alert.alert("Sign in failed", toAuthMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

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
        placeholder="••••••••"
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

      <Pressable onPress={() => router.push("/(auth)/sign-up")} disabled={submitting} style={styles.link}>
        <Text style={styles.linkText}>Create an account</Text>
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
