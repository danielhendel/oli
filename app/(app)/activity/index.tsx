import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useActivityOverviewScreenData } from "@/lib/data/activity/useActivityOverviewScreenData";
import { ActivityHistorySummaryCard } from "@/lib/ui/activity/ActivityHistorySummaryCard";
import { ActivityThisWeekCard } from "@/lib/ui/activity/ActivityThisWeekCard";
import { ActivityTodayCard } from "@/lib/ui/activity/ActivityTodayCard";
import { ActivityWeeklyStrip } from "@/lib/ui/activity/ActivityWeeklyStrip";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function ActivityOverviewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const data = useActivityOverviewScreenData();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Activity",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          calendarAccessibilityLabel="Open activity calendar"
          onCalendarPress={() => router.push("/(app)/activity/calendar")}
          overflowAccessibilityLabel="Activity settings"
          onOverflowPress={() => router.push("/(app)/activity/settings")}
        />
      ),
    });
  }, [navigation, router]);

  if (data.initializing) {
    return (
      <ModuleScreenShell title="Activity" subtitle="Steps & movement" hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!data.user) {
    return (
      <ModuleScreenShell title="Activity" subtitle="Steps & movement" hideTitleChrome>
        <EmptyState
          title="Sign in to view activity"
          description="Sign in to load your daily step rollups from Oli."
        />
      </ModuleScreenShell>
    );
  }

  const onStripDayPress = (day: string) => {
    router.push(`/(app)/activity/day/${day}`);
  };

  const headerStrip = (
    <ActivityWeeklyStrip
      days={data.weeklyStripDays}
      selectedDay={data.selectedDay}
      onDayPress={onStripDayPress}
    />
  );

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title="Activity"
        subtitle="Steps & movement"
        hideTitleChrome
        compactHeader
        headerContent={headerStrip}
      >
        <View style={styles.pageBody}>
          <ActivityTodayCard
            loading={data.dailyDetails.loading}
            error={data.dailyDetails.error}
            model={data.activityTodayCardModel}
          />
          <View style={styles.cardSpacer} />
          <ActivityThisWeekCard
            loading={data.dailyDetails.loading}
            model={data.activityThisWeekCardModel}
            onPressViewAll={() => router.push("/(app)/activity/history")}
          />
          <View style={styles.cardSpacer} />
          <ActivityHistorySummaryCard
            model={data.activityHistorySummaryModel}
            rollupAggregateError={data.rollupAggregateError}
            onPressViewMore={() => router.push("/(app)/activity/analytics")}
            onPressActivityRangeExplainer={(ctx) =>
              router.push({
                pathname: "/(app)/activity/activity-range-explainer",
                params: {
                  window: ctx.rowLabel,
                  tierIndex: String(ctx.tierIndexForBar),
                  tierLabel: ctx.tierLabel,
                  displayValue: ctx.displayValue,
                  ...(ctx.averageStepsPerDay != null && Number.isFinite(ctx.averageStepsPerDay)
                    ? { avgSteps: String(Math.round(ctx.averageStepsPerDay)) }
                    : {}),
                },
              })
            }
          />
        </View>
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageBody: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 14,
    flexGrow: 1,
  },
  cardSpacer: { height: 16 },
});
