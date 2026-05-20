import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, RefreshControl } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useSleepOverviewScreenData } from "@/lib/data/sleep/useSleepOverviewScreenData";
import { useSleepPullToRefresh } from "@/lib/data/useSleepPullToRefresh";
import { pickLatestSleepWeekDayWithPresence } from "@/lib/data/sleep/pickLatestSleepWeekDayWithPresence";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import {
  WORKOUTS_HEADER_TITLE_COLOR,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { RecoveryOuraWeeklyStrip } from "@/lib/ui/recovery/RecoveryOuraWeeklyStrip";
import { SleepBaselineCard } from "@/lib/ui/sleep/SleepBaselineCard";
import { SleepThisWeekCard } from "@/lib/ui/sleep/SleepThisWeekCard";
import { SleepTodayCard } from "@/lib/ui/sleep/SleepTodayCard";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";

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
  const [selectedDay, setSelectedDay] = useState(() => dayFromRoute ?? getTodayDayKeyLocal());
  const userPinnedSelectedDayRef = useRef(dayFromRoute != null);

  useEffect(() => {
    const d = parseDayRouteParam(params.day);
    if (d != null) {
      userPinnedSelectedDayRef.current = true;
      setSelectedDay(d);
    }
  }, [params.day]);

  const data = useSleepOverviewScreenData(selectedDay);
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);

  const weekPresenceFingerprint = useMemo(() => {
    if (data.weeklyStripDays.length === 0) return "";
    return data.weeklyStripDays
      .map((d) => `${d.day}:${d.meta?.hasOuraSnapshot === true ? 1 : 0}`)
      .join("|");
  }, [data.weeklyStripDays]);

  useEffect(() => {
    if (userPinnedSelectedDayRef.current) return;
    if (weekPresenceFingerprint.length === 0) return;
    const map = Object.fromEntries(
      data.weeklyStripDays.map((d) => [d.day, d.meta?.hasOuraSnapshot === true]),
    );
    if (map[selectedDay] === true) return;
    const pivot = pickLatestSleepWeekDayWithPresence(weekDayKeys, map);
    if (pivot != null && pivot !== selectedDay) {
      setSelectedDay(pivot);
    }
  }, [weekPresenceFingerprint, data.weeklyStripDays, selectedDay, weekDayKeys]);

  const onStripDayPress = useCallback((day: string) => {
    userPinnedSelectedDayRef.current = true;
    setSelectedDay(day);
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const { pullToRefreshSleep } = useSleepPullToRefresh({
    selectedDay,
    refetchSleep: () => {
      data.refetchSleepRollup({ cacheBust: `sleepOverviewPull:${Date.now()}` });
    },
    refetchWeekStrip: data.refetchWeekStrip,
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

  const headerStrip = (
    <RecoveryOuraWeeklyStrip
      days={data.weeklyStripDays}
      selectedDay={selectedDay}
      onDayPress={onStripDayPress}
      categoryLabel="sleep"
      stripVariant="sleep"
      testIDPrefix="sleep-weekly"
    />
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Sleep",
      headerTitleStyle: {
        fontSize: 21,
        fontWeight: "600",
        color: WORKOUTS_HEADER_TITLE_COLOR,
      },
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
      <ModuleScreenShell title="Sleep" hideTitleChrome compactHeader headerContent={headerStrip}>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!data.user) {
    return (
      <ModuleScreenShell title="Sleep" hideTitleChrome compactHeader headerContent={headerStrip}>
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
        hideTitleChrome
        compactHeader
        headerContent={headerStrip}
        refreshControl={sleepRefreshControl}
      >
        <View style={styles.pageBody}>
          <SleepTodayCard model={data.sleepTodayVm} />
          <View style={styles.cardSpacer} />
          <SleepThisWeekCard
            loading={data.weeklySleepLoading}
            model={data.weeklySleepVm}
            sleepBaselineVm={data.sleepBaselineVm}
          />
          <View style={styles.cardSpacer} />
          <SleepBaselineCard model={data.sleepBaselineVm} />
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
