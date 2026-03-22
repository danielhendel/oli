// app/(app)/_layout.tsx
import { View } from "react-native";
import { Stack } from "expo-router";
import { RestTimerProvider, RestTimerPanel } from "@/lib/workouts/restTimer";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function AppLayout() {
  return (
    <RestTimerProvider>
      <View style={{ flex: 1 }}>
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

          {/* Body Composition: title in nav header; weight screen sets headerRight (•••) via setOptions */}
          <Stack.Screen name="body/weight" options={{ title: "Body Composition" }} />
          <Stack.Screen name="body/index" options={{ headerTitle: "" }} />
          <Stack.Screen name="body/overview" options={{ headerTitle: "" }} />
          <Stack.Screen name="body/dexa" options={{ headerTitle: "" }} />

          {/* Keep native headers for the rest */}
          <Stack.Screen name="nutrition/index" options={{ title: "Nutrition" }} />
          <Stack.Screen
            name="workouts/index"
            options={{ title: "Workouts", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="workouts/calendar"
            options={{ title: "Workouts Calendar", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/day/[day]"
            options={{ title: "Workout Day", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/edit/rename"
            options={{ title: "Rename Workout", ...workoutsStackNavigationOptions("task") }}
          />
          <Stack.Screen
            name="workouts/edit/duration"
            options={{ title: "Edit Duration", ...workoutsStackNavigationOptions("task") }}
          />
          <Stack.Screen
            name="workouts/edit/type"
            options={{ title: "Edit Workout Type", ...workoutsStackNavigationOptions("task") }}
          />
          <Stack.Screen name="workouts/log" options={{ headerShown: false }} />
          <Stack.Screen
            name="workouts/analytics-detail"
            options={{ title: "Workout analytics", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/recent-workouts-full"
            options={{ title: "All workouts", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/history"
            options={{ title: "Workouts", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/exercise-picker"
            options={{ title: "Add exercise", ...workoutsStackNavigationOptions("task") }}
          />
          <Stack.Screen name="workouts/exercise-history" options={{ headerShown: false }} />
          <Stack.Screen name="recovery/index" options={{ title: "Recovery" }} />
          <Stack.Screen name="recovery/sleep" options={{ title: "Sleep" }} />
          <Stack.Screen name="recovery/readiness" options={{ title: "Readiness" }} />
          <Stack.Screen name="failures/index" options={{ title: "Failures" }} />
          <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
          <Stack.Screen name="settings/devices" options={{ title: "Devices" }} />
          <Stack.Screen name="settings/devices/[deviceId]" options={{ title: "" }} />
          {/* Secondary: API-ingest strength form. Primary strength log is workouts/log. */}
          <Stack.Screen name="training/strength/log" options={{ title: "Log Strength" }} />
          <Stack.Screen name="log/index" options={{ title: "Quick log" }} />
        </Stack>
        <RestTimerPanel />
      </View>
    </RestTimerProvider>
  );
}
