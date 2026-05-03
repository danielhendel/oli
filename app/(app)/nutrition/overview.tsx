import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
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
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

function headingTitleForSelectedDay(selectedDay: string, anchorToday: string): string {
  if (selectedDay === anchorToday) return "Today";
  const d = new Date(`${selectedDay}T12:00:00`);
  if (Number.isNaN(d.getTime())) return selectedDay;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function NutritionOverviewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ logged?: string; day?: string | string[] }>();
  const { user, initializing } = useAuth();
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayKeyLocal());
  const data = useNutritionOverviewScreenData(selectedDay);

  const headingTitle = useMemo(
    () => headingTitleForSelectedDay(selectedDay, data.todayKey),
    [selectedDay, data.todayKey],
  );

  const goDayDetail = useCallback(() => {
    router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day: selectedDay } });
  }, [router, selectedDay]);

  const loggedDayLabel =
    typeof routeParams.day === "string"
      ? routeParams.day
      : Array.isArray(routeParams.day)
        ? (routeParams.day[0] ?? "")
        : "";
  const loggedAck = routeParams.logged === "1";

  useFocusEffect(
    useCallback(() => {
      if (!loggedAck) return;
      void data.refetch();
    }, [loggedAck, data.refetch]),
  );

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
            selectedDay={selectedDay}
            onDayPress={setSelectedDay}
          />
        }
      >
        <View style={styles.pageBody}>
          {loggedAck ? (
            <View style={styles.loggedBanner} accessibilityRole="summary">
              <Text style={styles.loggedBannerTitle}>Meal logged</Text>
              <Text style={styles.loggedBannerSub}>
                {loggedDayLabel.length > 0
                  ? `Saved for ${loggedDayLabel}. Totals update as your data syncs.`
                  : "Totals update as your data syncs."}
              </Text>
              <Pressable
                onPress={() =>
                  router.replace({ pathname: "/(app)/nutrition", params: {} })
                }
                accessibilityRole="button"
                accessibilityLabel="Dismiss meal logged message"
                hitSlop={8}
              >
                <Text style={styles.loggedDismiss}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}
          <NutritionTodayCard
            headingTitle={headingTitle}
            model={data.todayCard}
            todayFacts={data.todayFacts}
            onRetryFacts={data.refetchTodayFacts}
            onViewMore={goDayDetail}
          />
          <NutritionRecentCard
            model={data.recentCard}
            recentRaw={data.recentRaw}
            hasDayRollup={data.hasDayRollup}
            dayKey={selectedDay}
            onViewMore={goDayDetail}
            onEntryPress={(dayKey) =>
              router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day: dayKey } })
            }
          />
        </View>
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loggedBanner: {
    backgroundColor: "rgba(52, 199, 89, 0.14)",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(52, 199, 89, 0.35)",
  },
  loggedBannerTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  loggedBannerSub: { fontSize: 15, color: "#3C3C43", lineHeight: 21 },
  loggedDismiss: { fontSize: 15, fontWeight: "600", color: "#007AFF", marginTop: 4 },
  pageBody: {
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    flexGrow: 1,
    gap: 20,
  },
});
