import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { sleepNightIsAttributedToCalendarDay } from "@/lib/data/dash/dailySleepCardViewModel";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { computeEnergyWeekNavigationState } from "@/lib/data/dash/energyWeekNavigation";
import { buildSleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import { buildSleepTodayDetailVm } from "@/lib/data/sleep/buildSleepTodayDetailVm";
import { buildSleepTodayVm } from "@/lib/data/sleep/buildSleepTodayVm";
import { buildWeeklySleepVm } from "@/lib/data/sleep/buildWeeklySleepVm";
import {
  computeSleepBaselineFetchDayKeys,
  computeSleepOverviewFetchDayKeys,
} from "@/lib/data/sleep/sleepOverviewRanges";
import { runSleepTodayRecoveryIfMissing } from "@/lib/data/sleep/runSleepTodayRecoveryIfMissing";
import { useSleepNightRollupMap } from "@/lib/data/sleep/useSleepNightRollupMap";
import { getTodayDayKeyLocal, getWeekStartSunday } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export function useSleepOverviewScreenData(selectedDay: string) {
  const { user, initializing, getIdToken } = useAuth();
  const todayDayKey = getTodayDayKeyLocal();
  const ouraPresence = useOuraPresence();

  const ouraDisconnected =
    ouraPresence.status === "ready" && ouraPresence.data.connected === false;

  /**
   * Independent "This Week's Sleep" navigator anchor (Sunday-aligned). Mirrors Activity's
   * `selectedWeekAnchorDay`: the weekly strip's `selectedDay` continues to drive the day
   * focus + Today card, while this anchor controls only the week shown by the chart card.
   */
  const [selectedWeekAnchorDay, setSelectedWeekAnchorDay] = useState<DayKey>(() =>
    getWeekStartSunday(todayDayKey),
  );
  const weekNav = useMemo(
    () =>
      computeEnergyWeekNavigationState({
        todayDayKey,
        weekAnchorDay: selectedWeekAnchorDay,
      }),
    [todayDayKey, selectedWeekAnchorDay],
  );
  const handlePressPreviousWeek = useCallback(() => {
    setSelectedWeekAnchorDay(weekNav.previousWeekAnchor);
  }, [weekNav.previousWeekAnchor]);
  const handlePressNextWeek = useCallback(() => {
    if (weekNav.nextWeekAnchor != null) {
      setSelectedWeekAnchorDay(weekNav.nextWeekAnchor);
    }
  }, [weekNav.nextWeekAnchor]);

  const fetchDayKeys = useMemo(() => {
    const base = computeSleepOverviewFetchDayKeys(selectedDay, todayDayKey);
    const navWeek = weekNav.weekDayKeys;
    const set = new Set<DayKey>([...base, ...navWeek]);
    return [...set].sort();
  }, [selectedDay, todayDayKey, weekNav.weekDayKeys]);

  const sleepRollup = useSleepNightRollupMap(fetchDayKeys);

  useFocusEffect(
    useCallback(() => {
      const bust = Date.now();
      void sleepRollup.refetch({ cacheBust: `sleepOverview:${bust}` });
    }, [sleepRollup.refetch]),
  );

  const todayCell = sleepRollup.sleepNightByDay[selectedDay];
  /**
   * Today readiness is **decoupled** from the global rollup `partial` flag. The Today card only
   * needs the requested calendar day's cell to be settled; we explicitly do **not** wait on the
   * trailing 12-month wave to complete. Future days never settle (the rollup partitions them
   * out), so a future `selectedDay` correctly stays in "partial" state until the page resolves.
   */
  const todayLoading =
    Boolean(user) && !initializing && todayCell?.settled !== true;

  const sleepTodayVm = useMemo(
    () =>
      buildSleepTodayVm({
        selectedDay,
        loading: todayLoading,
        cell: todayCell,
      }),
    [selectedDay, todayLoading, todayCell],
  );

  /**
   * Activity-parity detail VM for the Sleep Today card: hero headline (`7h 32m Sleep`) + the
   * same metric rows the Dash Daily Sleep card surfaces (Deep / REM / Efficiency / Lowest HR /
   * HRV), with attribution + settled guards baked in.
   */
  const sleepTodayDetailVm = useMemo(
    () =>
      buildSleepTodayDetailVm({
        day: selectedDay,
        loading: todayLoading,
        cell: todayCell,
        ouraDisconnected,
      }),
    [selectedDay, todayLoading, todayCell, ouraDisconnected],
  );

  const weeklySleepVm = useMemo(
    () =>
      buildWeeklySleepVm({
        todayDayKey,
        weekAnchorDay: weekNav.weekStart,
        weekDayKeys: weekNav.weekDayKeys,
        sleepNightByDay: sleepRollup.sleepNightByDay,
      }),
    [todayDayKey, weekNav.weekStart, weekNav.weekDayKeys, sleepRollup.sleepNightByDay],
  );

  const sleepBaselineVm = useMemo(
    () =>
      buildSleepBaselineVm({
        todayDayKey,
        sleepNightByDay: sleepRollup.sleepNightByDay,
      }),
    [todayDayKey, sleepRollup.sleepNightByDay],
  );

  /**
   * Weekly readiness: only the **elapsed** nav-week days (≤ today) need to be settled. We do
   * **not** wait on baseline-window days (d30 / d90 / YTD / 12 Month) — those are baseline-only
   * concerns.
   */
  const weeklyElapsedKeys = useMemo(
    () => weekNav.weekDayKeys.filter((d) => d <= todayDayKey),
    [weekNav.weekDayKeys, todayDayKey],
  );
  const weeklySleepLoading = useMemo(() => {
    if (!user || initializing) return false;
    if (weeklyElapsedKeys.length === 0) return false;
    return !weeklyElapsedKeys.every((d) => sleepRollup.sleepNightByDay[d]?.settled === true);
  }, [user, initializing, weeklyElapsedKeys, sleepRollup.sleepNightByDay]);

  /**
   * Baseline readiness: every elapsed day (≤ today) across the 7 / 30 / 90 / YTD / 12 Month
   * windows must be settled for the personalized explainer + filled rows to render. While
   * hydrating, the screen renders a polished "Calculating sleep baseline…" placeholder; once
   * complete, rows + explainer swap in. Attribution rules are unchanged — the baseline VM
   * itself still rejects non-attributed nights via `collectCompletedAttributedSleepNights`.
   */
  const baselineFetchKeys = useMemo(
    () => computeSleepBaselineFetchDayKeys(todayDayKey),
    [todayDayKey],
  );
  const baselineLoading = useMemo(() => {
    if (!user || initializing) return false;
    if (baselineFetchKeys.length === 0) return false;
    return !baselineFetchKeys.every((d) => sleepRollup.sleepNightByDay[d]?.settled === true);
  }, [user, initializing, baselineFetchKeys, sleepRollup.sleepNightByDay]);

  // Today-recovery: when the Sleep page is anchored on today and the canonical
  // SleepNight rollup has settled for today without an attributed view, trigger
  // the canonical refresh path once (rate-limited per uid:day). Refetch the
  // rollup on completion so today's card updates without manual pull-to-refresh.
  const uid = user?.uid ?? "";
  const todayIsMissing =
    Boolean(user) &&
    !initializing &&
    selectedDay === todayDayKey &&
    todayCell?.settled === true &&
    !sleepNightIsAttributedToCalendarDay(selectedDay, todayCell.view);
  const refetchSleepRollup = sleepRollup.refetch;
  useEffect(() => {
    if (!uid) return;
    if (!todayIsMissing) return;
    void runSleepTodayRecoveryIfMissing({
      uid,
      requestedDay: selectedDay,
      isMissing: true,
      todayDayKey,
      getIdToken,
      refetchSleep: (opts) => {
        refetchSleepRollup(opts);
      },
    });
  }, [uid, todayIsMissing, selectedDay, todayDayKey, getIdToken, refetchSleepRollup]);

  return {
    user,
    initializing,
    todayDayKey,
    sleepTodayVm,
    sleepTodayDetailVm,
    weeklySleepVm,
    sleepBaselineVm,
    weeklySleepLoading,
    /** True while baseline-window cells are still hydrating. Drives the "Calculating sleep baseline…" placeholder. */
    baselineLoading,
    refetchSleepRollup: sleepRollup.refetch,
    /** Sunday-anchored DayKey for the currently displayed "This Week's Sleep" card. */
    selectedWeekAnchorDay: weekNav.weekAnchorDay,
    setSelectedWeekAnchorDay,
    /** Header label such as "May 17\u201323" / "May 31\u2013Jun 6". */
    sleepThisWeekRangeLabel: weekNav.weekRangeLabel,
    sleepThisWeekCanGoPrevious: weekNav.canGoPrevious,
    sleepThisWeekCanGoNext: weekNav.canGoNext,
    onPressSleepPreviousWeek: handlePressPreviousWeek,
    onPressSleepNextWeek: handlePressNextWeek,
  };
}
