// app/(app)/_layout.tsx
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { ThemeProvider } from "@react-navigation/native";
import { OliFloatingNavigationHost } from "@/components/navigation/OliFloatingNavigationHost";
import { FloatingNavChromeHeightProvider } from "@/lib/ui/navigation/FloatingNavChromeHeightContext";
import { RestTimerProvider, RestTimerPanel } from "@/lib/workouts/restTimer";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import { useOliTheme } from "@/lib/ui/theme/OliThemeContext";

export default function AppLayout() {
  const [stackFloatingNavInset, setStackFloatingNavInset] = useState<number | undefined>();
  const onStackFloatingNavHeight = useCallback((height: number | undefined) => {
    setStackFloatingNavInset(height);
  }, []);

  const { navigationTheme } = useOliTheme();

  return (
    <ThemeProvider value={navigationTheme}>
    <RestTimerProvider>
      <FloatingNavChromeHeightProvider value={stackFloatingNavInset}>
        <View style={{ flex: 1, backgroundColor: UI_APP_SCREEN_BG }}>
          <Stack
            screenOptions={{
              headerBackButtonDisplayMode: "minimal",
              headerShadowVisible: false,
            }}
          >
          {/* Sprint 3 — Phase 1 tabs (Library, Manage, Timeline, Profile, Dash) */}
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: UI_APP_SCREEN_BG },
            }}
          />

          <Stack.Screen name="dash/daily-recap" options={{ title: "Daily Recap" }} />

          <Stack.Screen
            name="energy/energy-metric-explainer"
            options={{
              title: "Daily Energy",
              presentation: "modal",
              ...workoutsStackNavigationOptions("detail"),
            }}
          />

          <Stack.Screen
            name="energy/bmr"
            options={{ title: "BMR", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="energy/neat"
            options={{ title: "NEAT", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="energy/cardio"
            options={{ title: "Cardio", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="energy/strength"
            options={{ title: "Strength", ...workoutsStackNavigationOptions("detail") }}
          />

          {/* Event detail (from Library / Timeline) */}
          <Stack.Screen name="event/[id]" options={{ title: "Event" }} />

          {/* Hide native header on Command Center (we render our own large header) */}
          <Stack.Screen name="command-center/index" options={{ headerShown: false }} />

          {/* Body Composition */}
          <Stack.Screen name="body/weight" options={{ title: "Body Composition" }} />
          <Stack.Screen
            name="body/index"
            options={{ title: "Body Composition", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="body/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="body/day/[day]"
            options={{ title: "Body Day", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="body/metric/[metric]"
            options={{ title: "Body metric", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen name="body/overview" options={{ headerTitle: "" }} />
          <Stack.Screen name="body/dexa" options={{ headerTitle: "" }} />
          <Stack.Screen
            name="body/settings"
            options={{ title: "Body settings", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="body/body-metric-ranges-explainer"
            options={{
              title: "Ranges",
              presentation: "modal",
              ...workoutsStackNavigationOptions("detail"),
            }}
          />

          <Stack.Screen
            name="activity/index"
            options={{ title: "Activity", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="activity/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="activity/day/[day]"
            options={{ title: "Activity day", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="activity/settings"
            options={{ title: "Activity settings", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="activity/activity-range-explainer"
            options={{
              title: "Activity Ranges",
              presentation: "modal",
              ...workoutsStackNavigationOptions("detail"),
            }}
          />
          <Stack.Screen
            name="activity/history"
            options={{ title: "Activity history", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="activity/analytics"
            options={{ title: "Activity analytics", ...workoutsStackNavigationOptions("detail") }}
          />

          {/* Keep native headers for the rest */}
          <Stack.Screen
            name="nutrition/index"
            options={{ title: "Nutrition", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="nutrition/overview"
            options={{ title: "Nutrition", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="nutrition/day/[day]"
            options={{ title: "Nutrition day", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/analytics-detail"
            options={{ title: "Nutrition analytics", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/library"
            options={{ title: "Food Library", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/log"
            options={{ title: "Log nutrition", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/search"
            options={{ title: "Search food", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/scan"
            options={{ title: "Scan barcode", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/food/[foodId]"
            options={{ title: "Confirm meal", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/build-meal"
            options={{ title: "Build meal", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/targets"
            options={{ title: "Nutrition targets", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="nutrition/settings"
            options={{ title: "Nutrition settings", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/index"
            options={{ title: "Strength", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="workouts/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/day/[day]"
            options={{ title: "Strength Day", ...workoutsStackNavigationOptions("detail") }}
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
          <Stack.Screen name="workouts/enrich" options={{ headerShown: false }} />
          <Stack.Screen
            name="workouts/plan"
            options={{ title: "Plan", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/create"
            options={{ title: "Create", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/analytics-detail"
            options={{ title: "Strength analytics", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/strength-range-explainer"
            options={{
              title: "Strength Ranges",
              presentation: "modal",
              ...workoutsStackNavigationOptions("detail"),
            }}
          />
          <Stack.Screen
            name="workouts/today-muscle-group"
            options={{
              title: "",
              presentation: "modal",
              ...workoutsStackNavigationOptions("detail"),
            }}
          />
          <Stack.Screen
            name="workouts/recent-workouts-full"
            options={{ title: "All strength workouts", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="workouts/history"
            options={{ title: "Strength history", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen name="workouts/exercise-picker" options={{ headerShown: false }} />
          <Stack.Screen
            name="workouts/exercise-edit"
            options={{ title: "Edit exercise", ...workoutsStackNavigationOptions("task") }}
          />
          <Stack.Screen name="workouts/exercise-history" options={{ headerShown: false }} />
          <Stack.Screen
            name="workouts/settings"
            options={{ title: "Strength settings", ...workoutsStackNavigationOptions("detail") }}
          />

          <Stack.Screen
            name="cardio/index"
            options={{ title: "Cardio", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="cardio/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="cardio/day/[day]"
            options={{ title: "Cardio Day", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="cardio/plan"
            options={{ title: "Cardio plan", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="cardio/create"
            options={{ title: "Create cardio", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen name="cardio/log" options={{ headerShown: false }} />
          <Stack.Screen
            name="cardio/analytics-detail"
            options={{ title: "Cardio analytics", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="cardio/cardio-range-explainer"
            options={{
              title: "Cardio Ranges",
              presentation: "modal",
              ...workoutsStackNavigationOptions("detail"),
            }}
          />
          <Stack.Screen
            name="cardio/recent-workouts-full"
            options={{ title: "All cardio sessions", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="cardio/settings"
            options={{ title: "Cardio settings", ...workoutsStackNavigationOptions("detail") }}
          />

          <Stack.Screen name="recovery/index" options={{ title: "Recovery" }} />
          <Stack.Screen
            name="recovery/sleep"
            options={{ title: "Sleep", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="recovery/sleep/settings"
            options={{ title: "Sleep settings", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="recovery/sleep/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="recovery/readiness"
            options={{ title: "Readiness", ...workoutsStackNavigationOptions("module") }}
          />
          <Stack.Screen
            name="recovery/readiness/settings"
            options={{ title: "Readiness settings", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="recovery/readiness/calendar"
            options={{ title: "", ...workoutsStackNavigationOptions("detail") }}
          />
          <Stack.Screen
            name="dna/index"
            options={{ title: "DNA", ...workoutsStackNavigationOptions("module") }}
          />

          <Stack.Screen name="failures/index" options={{ title: "Failures" }} />
          <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
          <Stack.Screen name="settings/devices" options={{ title: "Devices" }} />
          <Stack.Screen name="settings/devices/[deviceId]" options={{ title: "" }} />
          <Stack.Screen name="profile/edit/[field]" options={{ title: "Edit" }} />
          <Stack.Screen
            name="fitness-goals"
            options={{ title: "Weekly Fitness Goals", ...workoutsStackNavigationOptions("detail") }}
          />
          {/* Secondary: API-ingest strength form. Primary strength log is workouts/log. */}
          <Stack.Screen name="training/strength/log" options={{ title: "Log Strength" }} />
          <Stack.Screen name="log/index" options={{ title: "Quick log" }} />
          </Stack>
          <OliFloatingNavigationHost onStackChromeHeightChange={onStackFloatingNavHeight} />
          <RestTimerPanel />
        </View>
      </FloatingNavChromeHeightProvider>
    </RestTimerProvider>
    </ThemeProvider>
  );
}
