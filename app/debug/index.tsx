import React from "react";
import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function DebugIndexScreen() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Debug</Text>

      <Text style={{ opacity: 0.75 }}>
        If you can see this, routing is working.
      </Text>

      <Link href="/debug/token" asChild>
        <Text style={{ fontWeight: "700" }}>Go to Debug Token</Text>
      </Link>
    </View>
  );
}
