import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { StyleSheet, View, RefreshControl } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useSleepOverviewScreenData } from "@/lib/data/sleep/useSleepOverviewScreenData";
import { useSleepPullToRefresh } from "@/lib/data/useSleepPullToRefresh";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { SleepBaselineCard } from "@/lib/ui/sleep/SleepBaselineCard";
import { SleepThisWeekCard } from "@/lib/ui/sleep/SleepThisWeekCard";
import { SleepTodayCard } from "@/lib/ui/sleep/SleepTodayCard";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

function parseDayRouteParam(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

export default function SleepScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayFromRoute = parseDayRouteParam(params.day);
  /**
   * `selectedDay` continues to drive the Today card + today-recovery flow even though the weekly
   * strip is no longer rendered on this screen (Activity-parity layout). The route param
   * (`/recovery/sleep?day=YYYY-MM-DD`) still wins so deep-links keep working; otherwise we anchor
   * on today's local day.
   */
  const [selectedDay, setSelectedDay] = useState(() => dayFromRoute ?? getTodayDayKeyLocal());

  useEffect(() => {
    const d = parseDayRouteParam(params.day);
    if (d != null) setSelectedDay(d);
  }, [params.day]);

  const data = useSleepOverviewScreenData(selectedDay);

  const [refreshing, setRefreshing] = useState(false);

  const { pullToRefreshSleep } = useSleepPullToRefresh({
    selectedDay,
    refetchSleep: () => {
      data.refetchSleepRollup({ cacheBust: `sleepOverviewPull:${Date.now()}` });
    },
  });

  const onSleepRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await pullToRefreshSleep();
    } finally {
      setRefreshing(false);
    }
  }, [pullToRefreshSleep]);

  const sleepRefreshControl = useMemo(
    () => (
      <RefreshControl refreshing={refreshing} onRefresh={onSleepRefresh} tintColor="#8E8E93" />
    ),
    [refreshing, onSleepRefresh],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Sleep",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          calendarAccessibilityLabel="Open sleep calendar"
          onCalendarPress={() => router.push("/(app)/recovery/sleep/calendar")}
          overflowAccessibilityLabel="Sleep settings"
          onOverflowPress={() => router.push("/(app)/recovery/sleep/settings")}
        />
      ),
    });
  }, [navigation, router]);

  if (data.initializing) {
    return (
      <ModuleScreenShell title="Sleep" subtitle="Sleep & recovery" hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!data.user) {
    return (
      <ModuleScreenShell title="Sleep" subtitle="Sleep & recovery" hideTitleChrome>
        <EmptyState
          title="Sign in to view sleep"
          description="Sign in to load your sleep nights from Oli."
        />
      </ModuleScreenShell>
    );
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title="Sleep"
        subtitle="Sleep & recovery"
        hideTitleChrome
        refreshControl={sleepRefreshControl}
      >
        <View style={styles.pageBody}>
          <SleepTodayCard model={data.sleepTodayDetailVm} />
          <View style={styles.cardSpacer} />
          <SleepThisWeekCard
            loading={data.weeklySleepLoading}
            model={data.weeklySleepVm}
            sleepBaselineVm={data.sleepBaselineVm}
            weekRangeLabel={data.sleepThisWeekRangeLabel}
            canGoPrevious={data.sleepThisWeekCanGoPrevious}
            canGoNext={data.sleepThisWeekCanGoNext}
            onPressPrevious={data.onPressSleepPreviousWeek}
            onPressNext={data.onPressSleepNextWeek}
          />
          <View style={styles.cardSpacer} />
          <SleepBaselineCard model={data.sleepBaselineVm} loading={data.baselineLoading} />
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
