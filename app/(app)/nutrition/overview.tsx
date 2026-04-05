import React, { useLayoutEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNutritionOverviewScreenData } from "@/lib/hooks/useNutritionOverviewScreenData";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { NutritionWeeklyStrip } from "@/lib/ui/nutrition/NutritionWeeklyStrip";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { NutritionTodayCard } from "@/lib/ui/nutrition/NutritionTodayCard";
import { NutritionRecentCard } from "@/lib/ui/nutrition/NutritionRecentCard";
import { NutritionWeeklyInsightsCard } from "@/lib/ui/nutrition/NutritionWeeklyInsightsCard";
import { NutritionOverviewBottomNav } from "@/lib/ui/nutrition/NutritionOverviewBottomNav";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function NutritionOverviewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const data = useNutritionOverviewScreenData();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          calendarAccessibilityLabel="Open nutrition calendar"
          onCalendarPress={() => router.push("/(app)/nutrition/calendar")}
          overflowAccessibilityLabel="Nutrition menu"
          onOverflowPress={() => router.push("/(app)/nutrition/settings")}
        />
      ),
      title: "Nutrition",
    });
  }, [navigation, router]);

  if (initializing) {
    return (
      <ModuleScreenShell title="Nutrition" subtitle="Macros & energy" hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title="Nutrition" subtitle="Macros & energy" hideTitleChrome>
        <EmptyState
          title="Sign in to view nutrition"
          description="Sign in to see daily macro rollups and nutrition logs."
        />
      </ModuleScreenShell>
    );
  }

  const goAnalytics = () => router.push("/(app)/nutrition/analytics-detail");

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title="Nutrition"
        subtitle="Macros & energy"
        hideTitleChrome
        compactHeader
        headerContent={
          <NutritionWeeklyStrip
            days={data.weeklyStripDays}
            selectedDay={data.todayKey}
            onDayPress={(day) =>
              router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day } })
            }
          />
        }
      >
        <View style={styles.pageBody}>
          <NutritionTodayCard
            model={data.todayCard}
            todayFacts={data.todayFacts}
            onRetryFacts={data.refetchTodayFacts}
            onViewMore={goAnalytics}
          />
          <NutritionRecentCard
            model={data.recentCard}
            events={data.events}
            onRetryEvents={data.refetchEvents}
            onViewMore={goAnalytics}
            onEntryPress={(dayKey) =>
              router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day: dayKey } })
            }
          />
          <NutritionWeeklyInsightsCard
            model={data.weeklyInsights}
            events={data.events}
            onRetryEvents={data.refetchEvents}
            onInsightPress={() => goAnalytics()}
          />
        </View>
      </ModuleScreenShell>
      <NutritionOverviewBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageBody: {
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    flexGrow: 1,
    gap: 20,
  },
});
