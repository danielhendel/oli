import React from "react";
import { View, Text } from "react-native";

export default function DebugScreen() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Debug</Text>
      <Text style={{ marginTop: 10, opacity: 0.75 }}>
        If you can see this, routing is working.
      </Text>
    </View>
  );
}
