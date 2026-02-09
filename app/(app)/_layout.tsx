// app/(app)/_layout.tsx
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      {/* Sprint 3 — Phase 1 tabs (Library, Manage, Timeline, Stats, Dash) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Event detail (from Library / Timeline) */}
      <Stack.Screen name="event/[id]" options={{ title: "Event" }} />

      {/* Hide native header on Command Center (we render our own large header) */}
      <Stack.Screen name="command-center/index" options={{ headerShown: false }} />

      {/* Keep native headers for the rest */}
      <Stack.Screen name="nutrition/index" options={{ title: "Nutrition" }} />
      <Stack.Screen name="workouts/index" options={{ title: "Workouts" }} />
      <Stack.Screen name="recovery/index" options={{ title: "Recovery" }} />
      <Stack.Screen name="failures/index" options={{ title: "Failures" }} />
      <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
      <Stack.Screen name="training/strength/log" options={{ title: "Log Strength" }} />
      <Stack.Screen name="log/index" options={{ title: "Quick log" }} />
    </Stack>
  );
}
