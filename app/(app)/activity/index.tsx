import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useActivityOverviewScreenData } from "@/lib/data/activity/useActivityOverviewScreenData";
import { ACTIVITY_BASELINE_DEFINITION_SENTENCE } from "@/lib/ui/activity/activityBaselineCopy";
import { ActivityDailyDetailsCard } from "@/lib/ui/activity/ActivityDailyDetailsCard";
import { ActivityOverviewCard } from "@/lib/ui/activity/ActivityOverviewCard";
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
    // Day detail is route-driven only; do not mutate strip/overview anchor state here.
    // Push a concrete path so the dynamic segment always matches the tapped day (avoids param merge edge cases).
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
          <ActivityDailyDetailsCard
            headingTitle="Activity Baseline"
            ratingTestID="activity-baseline-details-rating"
            stepsBarTestID="activity-baseline-details-steps-bar"
            loading={data.baselineDetails.loading}
            error={data.baselineDetails.error}
            model={data.baselineDetails.model}
            footerCaption={ACTIVITY_BASELINE_DEFINITION_SENTENCE}
          />
          <View style={styles.cardSpacer} />
          <ActivityDailyDetailsCard
            loading={data.dailyDetails.loading}
            error={data.dailyDetails.error}
            model={data.dailyDetails.model}
            {...(data.dailyDetails.model?.deltaFromBaselineLabel != null &&
            data.dailyDetails.model.deltaFromBaselineLabel.length > 0
              ? { deltaLabel: data.dailyDetails.model.deltaFromBaselineLabel }
              : {})}
          />
          <View style={styles.cardSpacer} />
          <ActivityOverviewCard
            loading={data.overview.loading}
            error={data.overview.error}
            model={data.overview.model}
            yesterdayRowLoading={data.overview.yesterdayRowLoading}
            yesterdayRowError={data.overview.yesterdayRowError}
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
