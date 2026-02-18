// app/(app)/_layout.tsx
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
      }}
    >
      {/* Sprint 3 — Phase 1 tabs (Library, Manage, Timeline, Stats, Dash) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Event detail (from Library / Timeline) */}
      <Stack.Screen name="event/[id]" options={{ title: "Event" }} />

      {/* Hide native header on Command Center (we render our own large header) */}
      <Stack.Screen name="command-center/index" options={{ headerShown: false }} />

      {/* Body: back chevron only, no center title (in-screen H1 is the title) */}
      <Stack.Screen name="body/weight" options={{ headerTitle: "" }} />
      <Stack.Screen name="body/index" options={{ headerTitle: "" }} />
      <Stack.Screen name="body/overview" options={{ headerTitle: "" }} />
      <Stack.Screen name="body/dexa" options={{ headerTitle: "" }} />

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
