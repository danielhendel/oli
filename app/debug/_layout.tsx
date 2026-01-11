// app/debug/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function DebugLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Debug" }} />
      <Stack.Screen name="token" options={{ title: "Token" }} />
      <Stack.Screen name="api-smoke" options={{ title: "API Smoke" }} />
    </Stack>
  );
}
