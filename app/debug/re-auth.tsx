// app/debug/re-auth.tsx
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function DebugReAuthScreen() {
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const run = async () => {
    setLoading(true);
    try {
      if (!user) {
        setResult("Not signed in.");
        return;
      }
      const t = await getIdToken(true); // ✅ force refresh
      setResult(t ? `Token refreshed.\n\nuid=${user.uid}\nlen=${t.length}` : "Failed to refresh token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "900" }}>Re-auth</Text>

      <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "800" }}>Status</Text>
        <Text>Signed in: {user ? `yes (${user.uid.slice(0, 8)}…)` : "no"}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={run}
        disabled={loading}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
          alignItems: "center",
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Force Refresh Token</Text>}
      </Pressable>

      {result ? (
        <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontFamily: "Courier" }}>{result}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
