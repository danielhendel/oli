// app/debug/token.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

// IMPORTANT: use the same module resolution as the rest of the app to avoid duplicate context instances
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DebugTokenScreen() {
  const authState = useAuth();
  const [token, setToken] = useState<string>("");

  const user = authState.user;
  const getIdToken = authState.getIdToken;
  const signOutUser = authState.signOutUser;

  const diagnostics = useMemo(() => {
    const tokenLen = token ? token.length : 0;
    const dotCount = token ? (token.match(/\./g)?.length ?? 0) : 0;
    const tokenPreview = token ? `${token.slice(0, 16)}…${token.slice(-16)}` : "—";
    return { tokenLen, dotCount, tokenPreview };
  }, [token]);

  const onCopy = async () => {
    if (!token) {
      Alert.alert("No token", "Generate a token first.");
      return;
    }
    await Clipboard.setStringAsync(token);
    Alert.alert("Copied", "ID token copied to clipboard.");
  };

  const onGenerate = async (forceRefresh?: boolean) => {
    try {
      const t = await getIdToken(forceRefresh);
      if (!t) {
        Alert.alert("Not signed in", "Sign in first to generate a token.");
        return;
      }
      setToken(t);
    } catch (e) {
      Alert.alert("Failed to generate token", String(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Firebase ID Token</Text>

      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }}>
        <Text style={{ color: "#555" }}>UID</Text>
        <Text style={{ fontWeight: "700" }}>{user?.uid ?? "—"}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onGenerate(false)}
        style={{ backgroundColor: "#111", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Generate token</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => onGenerate(true)}
        style={{ backgroundColor: "#111", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Refresh + generate</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onCopy}
        style={{ backgroundColor: "#444", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Copy token</Text>
      </Pressable>

      {/* Diagnostics that prove whether this is a real JWT without exposing it */}
      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }}>
        <Text style={{ color: "#555" }}>Token diagnostics</Text>
        <Text style={{ fontWeight: "700" }}>len: {diagnostics.tokenLen}</Text>
        <Text style={{ fontWeight: "700" }}>dots: {diagnostics.dotCount}</Text>
        <Text style={{ fontWeight: "700" }}>preview: {diagnostics.tokenPreview}</Text>
      </View>

      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }}>
        <Text style={{ color: "#555", marginBottom: 8 }}>Token</Text>
        <Text selectable style={{ fontSize: 12, lineHeight: 18 }}>
          {token || "—"}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => signOutUser()}
        style={{ backgroundColor: "#b00020", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
