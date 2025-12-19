// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Product shell */}
        <Stack.Screen name="(app)" />

        {/* Root index can redirect into the shell */}
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
