// app/(app)/(tabs)/library/_layout.tsx
import { Stack } from "expo-router";

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[category]" />
      <Stack.Screen name="lineage/[canonicalEventId]" options={{ title: "Lineage" }} />
      <Stack.Screen name="replay/day/[dayKey]" options={{ title: "Replay" }} />
    </Stack>
  );
}
