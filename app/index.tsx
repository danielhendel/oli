import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 32, fontWeight: "700" }}>Oli</Text>
      <Text style={{ marginTop: 12, fontSize: 16, opacity: 0.75 }}>
        Command Center (boot sanity screen)
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/debug")}
        style={{
          marginTop: 24,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Open Debug Screen</Text>
      </Pressable>
    </View>
  );
}
