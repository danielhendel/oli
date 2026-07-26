/**
 * Shared bounded SleepNight history for sleep metric detail sheets (90 inclusive days).
 *
 * One GET /users/me/sleep-nights request for [selectedDay−89, selectedDay],
 * shared across Duration / Deep / REM via {@link sleepMetricDetailHistoryStore}.
 * No YTD. No separate 7/30/90 requests.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT,
  sleepDurationDetailHistoryDayKeys,
} from "@/lib/data/sleep/sleepDurationAverages";
import {
  ensureSleepMetricDetailHistory,
  peekSleepMetricDetailHistory,
  subscribeSleepMetricDetailHistory,
  type SleepMetricDetailHistoryStatus,
} from "@/lib/data/sleep/sleepMetricDetailHistoryStore";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseSleepMetricDetailHistoryResult = {
  status: SleepMetricDetailHistoryStatus;
  sleepNightByDay: Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>;
  errorMessage: string | null;
  refetch: (opts?: { cacheBust?: string }) => void;
  rangeStart: DayKey | null;
  rangeEnd: DayKey | null;
};

export type UseSleepMetricDetailHistoryOptions = {
  selectedDay: DayKey;
  /** Device today — caps future days out of the requested window. */
  todayDayKey: DayKey;
  enabled?: boolean;
};

/**
 * Fetches a single bounded 90-day SleepNight range ending on `selectedDay`
 * (clamped so the end is never after device today).
 */
export function useSleepMetricDetailHistory(
  opts: UseSleepMetricDetailHistoryOptions,
): UseSleepMetricDetailHistoryResult {
  const { selectedDay, todayDayKey, enabled = true } = opts;
  const { user, initializing, getIdToken } = useAuth();

  const endDay = selectedDay <= todayDayKey ? selectedDay : todayDayKey;
  const startDay = addCalendarDaysToDayKey(endDay, -(SLEEP_DURATION_DETAIL_HISTORY_DAY_COUNT - 1));
  const dayKeys = useMemo(
    () => sleepDurationDetailHistoryDayKeys(endDay).filter((d) => d <= todayDayKey),
    [endDay, todayDayKey],
  );

  const uid = user?.uid ?? null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled || uid == null) return () => undefined;
      return subscribeSleepMetricDetailHistory(uid, startDay, endDay, onStoreChange);
    },
    [enabled, uid, startDay, endDay],
  );

  const getSnapshot = useCallback(() => {
    if (!enabled || uid == null) return null;
    return peekSleepMetricDetailHistory(uid, startDay, endDay);
  }, [enabled, uid, startDay, endDay]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled || initializing || uid == null) return;
    void ensureSleepMetricDetailHistory({
      uid,
      rangeStart: startDay,
      rangeEnd: endDay,
      dayKeys,
      getIdToken,
    });
  }, [enabled, initializing, uid, startDay, endDay, dayKeys, getIdToken]);

  const refetch = useCallback(
    (refetchOpts?: { cacheBust?: string }) => {
      if (!enabled || uid == null) return;
      void ensureSleepMetricDetailHistory({
        uid,
        rangeStart: startDay,
        rangeEnd: endDay,
        dayKeys,
        getIdToken,
        cacheBust: refetchOpts?.cacheBust ?? `retry-${Date.now()}`,
      });
    },
    [enabled, uid, startDay, endDay, dayKeys, getIdToken],
  );

  if (!enabled || uid == null) {
    return {
      status: "idle",
      sleepNightByDay: {},
      errorMessage: null,
      refetch,
      rangeStart: null,
      rangeEnd: null,
    };
  }

  return {
    status: snapshot?.historyStatus ?? "idle",
    sleepNightByDay: snapshot?.sleepNightByDay ?? {},
    errorMessage: snapshot?.errorMessage ?? null,
    refetch,
    rangeStart: startDay,
    rangeEnd: endDay,
  };
}
