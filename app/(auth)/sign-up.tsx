// app/(auth)/sign-up.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { getFirebaseAuth } from "../../lib/firebaseConfig";

export default function SignUpScreen() {
  const router = useRouter();
  const auth = useMemo(() => getFirebaseAuth(), []);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const onSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(app)/command-center");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Sign up failed.";
      Alert.alert("Sign up failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Create account</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 10,
        }}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password (6+ chars)"
        secureTextEntry
        textContentType="newPassword"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 10,
        }}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onSignUp}
        disabled={loading}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Creating..." : "Create account"}
        </Text>
      </Pressable>

      <Text style={{ color: "#555" }}>
        Already have an account?{" "}
        <Link href="/(auth)/sign-in" style={{ fontWeight: "700" }}>
          Sign in
        </Link>
      </Text>
    </View>
  );
}
