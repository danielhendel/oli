// app/(app)/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "Oli",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Command Center" }} />
      <Stack.Screen name="workouts/index" options={{ title: "Workouts" }} />
      <Stack.Screen name="nutrition/index" options={{ title: "Nutrition" }} />
      <Stack.Screen name="recovery/index" options={{ title: "Recovery" }} />
      <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
    </Stack>
  );
}
