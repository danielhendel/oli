// app/dev/index.tsx
import React, { useState } from "react";
import { View, Alert } from "react-native";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/api/client";

type MeResponse = { ok: boolean; uid: string };

export default function DevScreen() {
  const { user, signInWithApple, signInWithGoogle, signOut } = useAuth();
  const [result, setResult] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function pingMe() {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in first to call /me.");
      return;
    }
    setLoading(true);
    try {
      const json = await apiFetch<MeResponse>("/me");
      setResult(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setResult(null);
      Alert.alert("API error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text size="xl" weight="bold">
        Dev Console
      </Text>
      <Text tone="muted">User: {user?.uid ?? "—"}</Text>

      {!user ? (
        <>
          <Button label="Sign in with Apple" onPress={signInWithApple} />
          <Button label="Sign in with Google" onPress={signInWithGoogle} />
        </>
      ) : (
        <>
          <Button
            label={loading ? "Pinging..." : "Ping /me"}
            onPress={pingMe}
            disabled={loading}
          />
          <Button label="Sign out" onPress={signOut} />
        </>
      )}

      {result && (
        <Text testID="meResult" accessibilityLabel="Ping result" style={{ marginTop: 8 }}>
          {JSON.stringify(result)}
        </Text>
      )}
    </View>
  );
}
