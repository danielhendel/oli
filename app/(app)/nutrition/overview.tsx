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
import { NutritionThisWeekCard } from "@/lib/ui/nutrition/NutritionThisWeekCard";
import { NutritionBaselineCard } from "@/lib/ui/nutrition/NutritionBaselineCard";
import { NutritionYearlyCard } from "@/lib/ui/nutrition/NutritionYearlyCard";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { getTodayDayKeyLocal, addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import { isValidDayKey } from "@/lib/ui/calendar/types";

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

  const goMacroDetail = useCallback(
    (macro: "protein" | "carbs" | "fat") => {
      router.push({ pathname: "/(app)/nutrition/macro/[macro]", params: { macro, day: selectedDay } });
    },
    [router, selectedDay],
  );

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
      // Keep the strip selection on the day we just logged to (source of truth).
      if (isValidDayKey(loggedDayLabel) && loggedDayLabel !== selectedDay) {
        setSelectedDay(loggedDayLabel);
      }
      void data.refetch();
    }, [loggedAck, loggedDayLabel, selectedDay, data.refetch]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          calendarAccessibilityLabel="Open nutrition calendar"
          onCalendarPress={() => router.push("/(app)/nutrition/calendar")}
          logAccessibilityLabel="Open nutrition log"
          onLogPress={() => router.push("/(app)/nutrition/list")}
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
              <Text style={styles.loggedBannerTitle}>Nutrition logged</Text>
              <Text style={styles.loggedBannerSub}>
                {loggedDayLabel.length > 0
                  ? `Saved for ${loggedDayLabel}. Totals update as your data syncs.`
                  : "Totals update as your data syncs."}
              </Text>
              <Pressable
                onPress={() => router.replace({ pathname: "/(app)/nutrition", params: {} })}
                accessibilityRole="button"
                accessibilityLabel="Dismiss nutrition logged message"
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
            loading={data.factsRollupLoading && data.todayFacts.isLoading}
            totalsSyncing={data.totalsSyncing}
            onRetryFacts={data.refetchTodayFacts}
            onViewMore={goDayDetail}
            onPressMacro={goMacroDetail}
          />

          <NutritionThisWeekCard
            loading={data.factsRollupLoading}
            model={data.thisWeekCard}
            canGoPrevious={data.canGoPreviousWeek}
            canGoNext={data.canGoNextWeek}
            onPressPrevious={() =>
              data.setSelectedWeekAnchorDay(addCalendarDaysToDayKey(data.selectedWeekAnchorDay, -7))
            }
            onPressNext={() =>
              data.setSelectedWeekAnchorDay(addCalendarDaysToDayKey(data.selectedWeekAnchorDay, 7))
            }
            onPressDay={(day) =>
              router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day } })
            }
          />

          <NutritionBaselineCard
            model={data.baselineModel}
            onPressViewMore={() => router.push("/(app)/nutrition/analytics-detail")}
          />

          {data.yearlyCardModel.hasData ||
          data.selectedNutritionYear === Number.parseInt(data.todayKey.slice(0, 4), 10) ? (
            <NutritionYearlyCard
              loading={data.factsRollupLoading}
              model={data.yearlyCardModel}
              canGoPrevious={data.canGoPreviousYear}
              canGoNext={data.canGoNextYear}
              onPressPrevious={() => data.setSelectedNutritionYear(data.selectedNutritionYear - 1)}
              onPressNext={() => data.setSelectedNutritionYear(data.selectedNutritionYear + 1)}
            />
          ) : null}

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
  loggedBannerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  loggedBannerSub: { fontSize: 15, color: "rgba(235, 235, 245, 0.7)", lineHeight: 21 },
  loggedDismiss: { fontSize: 15, fontWeight: "600", color: "#0A84FF", marginTop: 4 },
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
