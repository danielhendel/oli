import { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { buildSleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import { buildSleepTodayVm } from "@/lib/data/sleep/buildSleepTodayVm";
import { buildWeeklySleepVm } from "@/lib/data/sleep/buildWeeklySleepVm";
import { computeSleepOverviewFetchDayKeys } from "@/lib/data/sleep/sleepOverviewRanges";
import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import { useSleepWeekDataPresence } from "@/lib/data/useSleepWeekDataPresence";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";

export function useSleepOverviewScreenData(selectedDay: string) {
  const { user, initializing } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const weekDayKeys = useMemo(() => getWeekDaysForAnchor(selectedDay), [selectedDay]);

  const fetchDayKeys = useMemo(
    () => computeSleepOverviewFetchDayKeys(selectedDay, todayDayKey),
    [selectedDay, todayDayKey],
  );

  const sleepRollup = useSleepNightRollupMap(fetchDayKeys);
  const weekStripPresence = useSleepWeekDataPresence(weekDayKeys);

  useFocusEffect(
    useCallback(() => {
      const bust = Date.now();
      void sleepRollup.refetch({ cacheBust: `sleepOverview:${bust}` });
      void weekStripPresence.refetch();
    }, [sleepRollup.refetch, weekStripPresence.refetch]),
  );

  const weeklyStripDays: CalendarDay<{ hasOuraSnapshot: boolean }>[] = useMemo(() => {
    const map =
      weekStripPresence.status === "ready" ? weekStripPresence.hasSleepDataByDay : {};
    return weekDayKeys.map((day) => ({
      day,
      meta: { hasOuraSnapshot: map[day] === true },
    }));
  }, [weekDayKeys, weekStripPresence]);

  const todayCell = sleepRollup.sleepNightByDay[selectedDay];
  const todayLoading =
    Boolean(user) &&
    !initializing &&
    (sleepRollup.status === "partial" || todayCell?.settled !== true);

  const sleepTodayVm = useMemo(
    () =>
      buildSleepTodayVm({
        selectedDay,
        loading: todayLoading,
        cell: todayCell,
      }),
    [selectedDay, todayLoading, todayCell],
  );

  const weeklySleepVm = useMemo(
    () =>
      buildWeeklySleepVm({
        todayDayKey,
        weekAnchorDay: selectedDay,
        weekDayKeys,
        sleepNightByDay: sleepRollup.sleepNightByDay,
      }),
    [todayDayKey, selectedDay, weekDayKeys, sleepRollup.sleepNightByDay],
  );

  const sleepBaselineVm = useMemo(
    () =>
      buildSleepBaselineVm({
        todayDayKey,
        sleepNightByDay: sleepRollup.sleepNightByDay,
      }),
    [todayDayKey, sleepRollup.sleepNightByDay],
  );

  const weeklySleepLoading =
    Boolean(user) && !initializing && sleepRollup.status === "partial";

  return {
    user,
    initializing,
    todayDayKey,
    weeklyStripDays,
    sleepTodayVm,
    weeklySleepVm,
    sleepBaselineVm,
    weeklySleepLoading,
    refetchSleepRollup: sleepRollup.refetch,
    refetchWeekStrip: weekStripPresence.refetch,
  };
}
