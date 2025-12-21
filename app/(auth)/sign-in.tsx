// app/(auth)/sign-in.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";

import { getFirebaseAuth } from "../../lib/firebaseConfig";

export default function SignInScreen() {
  const router = useRouter();
  const auth = useMemo(() => getFirebaseAuth(), []);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const onSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(app)/command-center");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Sign in failed.";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Sign in</Text>

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
        placeholder="Password"
        secureTextEntry
        textContentType="password"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 10,
        }}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onSignIn}
        disabled={loading}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Signing in..." : "Sign in"}
        </Text>
      </Pressable>

      <View style={{ gap: 8, marginTop: 6 }}>
        <Text style={{ color: "#555" }}>
          No account?{" "}
          <Link href="/(auth)/sign-up" style={{ fontWeight: "700" }}>
            Create one
          </Link>
        </Text>

        {/* Use Link asChild to ensure the text is reliably pressable on iOS */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Text style={{ color: "#555" }}>Need a token for API tests?</Text>

          <Link href="/debug/token" asChild>
            <Text style={{ fontWeight: "700", color: "#555" }}>Debug token</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}
