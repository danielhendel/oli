// app/(app)/_layout.tsx
import React from "react";
import { Stack, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

export default function AppLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Oli",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/(app)/settings")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
            >
              <Text style={{ fontSize: 16, fontWeight: "600" }}>Settings</Text>
            </Pressable>
          ),
        }}
      />

      {/* Keep these explicit so titles are stable as we expand */}
      <Stack.Screen name="command-center/index" options={{ title: "Oli" }} />
      <Stack.Screen name="workouts/index" options={{ title: "Workouts" }} />
      <Stack.Screen name="nutrition/index" options={{ title: "Nutrition" }} />
      <Stack.Screen name="recovery/index" options={{ title: "Recovery" }} />
      <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
    </Stack>
  );
}
