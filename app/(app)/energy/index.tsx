import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";

import { buildWeeklyEnergyVm } from "@/lib/data/dash/buildWeeklyEnergyVm";
import { computeEnergyWeekNavigationState } from "@/lib/data/dash/energyWeekNavigation";
import { useWeeklyDailyEnergyMap } from "@/lib/data/dash/useWeeklyDailyEnergyMap";
import {
  buildEnergyBaselineVm,
  computeEnergyBaselineFetchDayKeys,
} from "@/lib/data/energy/buildEnergyBaselineVm";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_HEADER_TITLE_COLOR,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import { EnergyBaselineCard } from "@/lib/ui/energy/EnergyBaselineCard";
import { EnergyThisWeekCard } from "@/lib/ui/energy/EnergyThisWeekCard";
import { getTodayDayKeyLocal, getWeekStartSunday } from "@/lib/ui/calendar/dateUtils";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DayKey } from "@/lib/ui/calendar/types";

export default function DailyEnergyScreen() {
  const navigation = useNavigation();
  const { user, initializing } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();

  const [weekAnchorDay, setWeekAnchorDay] = useState<DayKey>(() =>
    getWeekStartSunday(todayDayKey),
  );

  const weekNav = useMemo(
    () => computeEnergyWeekNavigationState({ todayDayKey, weekAnchorDay }),
    [todayDayKey, weekAnchorDay],
  );

  const handlePressPreviousWeek = useCallback(() => {
    setWeekAnchorDay(weekNav.previousWeekAnchor);
  }, [weekNav.previousWeekAnchor]);

  const handlePressNextWeek = useCallback(() => {
    if (weekNav.nextWeekAnchor != null) {
      setWeekAnchorDay(weekNav.nextWeekAnchor);
    }
  }, [weekNav.nextWeekAnchor]);

  const baselineFetchKeys = useMemo(
    () => computeEnergyBaselineFetchDayKeys(todayDayKey),
    [todayDayKey],
  );
  const energyFetchKeys = useMemo(() => {
    const set = new Set<string>([...weekNav.weekDayKeys, ...baselineFetchKeys]);
    return [...set].sort();
  }, [weekNav.weekDayKeys, baselineFetchKeys]);
  const energyRollup = useWeeklyDailyEnergyMap(energyFetchKeys);

  useFocusEffect(
    useCallback(() => {
      energyRollup.refetch({ cacheBust: `dailyEnergyOverview:${Date.now()}` });
    }, [energyRollup.refetch]),
  );

  const weeklyEnergyVm = useMemo(
    () =>
      buildWeeklyEnergyVm({
        todayDayKey,
        weekAnchorDay: weekNav.weekAnchorDay,
        weekDayKeys: weekNav.weekDayKeys,
        energyByDay: energyRollup.energyByDay,
      }),
    [todayDayKey, weekNav.weekAnchorDay, weekNav.weekDayKeys, energyRollup.energyByDay],
  );

  const energyBaselineVm = useMemo(
    () =>
      buildEnergyBaselineVm({
        todayDayKey,
        energyByDay: energyRollup.energyByDay,
      }),
    [todayDayKey, energyRollup.energyByDay],
  );

  const weeklyLoading = Boolean(user) && !initializing && energyRollup.status === "partial";
  const baselineLoading = weeklyLoading;

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Daily Energy",
      headerTitleStyle: {
        fontSize: 21,
        fontWeight: "600",
        color: WORKOUTS_HEADER_TITLE_COLOR,
      },
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  if (initializing) {
    return (
      <ModuleScreenShell title="Daily Energy" hideTitleChrome compactHeader>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title="Daily Energy" hideTitleChrome compactHeader>
        <EmptyState
          title="Sign in to view daily energy"
          description="Sign in to load your energy estimates from Oli."
        />
      </ModuleScreenShell>
    );
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Daily Energy" hideTitleChrome compactHeader>
        <View style={styles.pageBody}>
          <EnergyThisWeekCard
            loading={weeklyLoading}
            model={weeklyEnergyVm}
            weekRangeLabel={weekNav.weekRangeLabel}
            canGoPrevious={weekNav.canGoPrevious}
            canGoNext={weekNav.canGoNext}
            onPressPrevious={handlePressPreviousWeek}
            onPressNext={handlePressNextWeek}
          />
          <View style={styles.cardSpacer} />
          <EnergyBaselineCard loading={baselineLoading} model={energyBaselineVm} />
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
