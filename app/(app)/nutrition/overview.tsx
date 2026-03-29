import React, { useLayoutEffect } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNutritionOverviewScreenData } from "@/lib/hooks/useNutritionOverviewScreenData";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderIconButton } from "@/lib/ui/HeaderIconButton";
import { WorkoutsHeaderRightRow } from "@/lib/ui/headers/WorkoutsHeaderRightRow";
import { NutritionWeeklyStrip } from "@/lib/ui/nutrition/NutritionWeeklyStrip";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { NutritionTodayCard } from "@/lib/ui/nutrition/NutritionTodayCard";
import { NutritionRecentCard } from "@/lib/ui/nutrition/NutritionRecentCard";
import { NutritionWeeklyInsightsCard } from "@/lib/ui/nutrition/NutritionWeeklyInsightsCard";
import { NutritionOverviewBottomNav } from "@/lib/ui/nutrition/NutritionOverviewBottomNav";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

function NutritionHeaderOverflowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={headerMenuStyles.btn}
      accessibilityRole="button"
      accessibilityLabel="Nutrition menu"
    >
      <Text style={headerMenuStyles.text}>•••</Text>
    </Pressable>
  );
}

const headerMenuStyles = StyleSheet.create({
  btn: { padding: 12 },
  text: { fontSize: 18, color: "#1C1C1E", fontWeight: "700" },
});

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
        <WorkoutsHeaderRightRow>
          <HeaderIconButton
            iconName="calendar-outline"
            iconSize={24}
            color={NUTRITION_ACCENT}
            accessibilityLabel="Open nutrition calendar"
            onPress={() => router.push("/(app)/nutrition/calendar")}
          />
          <NutritionHeaderOverflowButton onPress={() => router.push("/(app)/nutrition/settings")} />
        </WorkoutsHeaderRightRow>
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
